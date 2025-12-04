import {
  loadHeader,
  loadFooter,
  buildBlock,
  decorateBlock,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadBlock,
  loadSection,
  loadSections,
  loadCSS,
  toClassName,
  getMetadata,
} from './aem.js';

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

function autolinkModals(element) {
  element.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');

    if (origin && origin.href && origin.href.includes('/modals/')) {
      e.preventDefault();
      const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
      openModal(origin.href);
    }
  });
}

function createFieldWrapper(fd) {
  const fieldWrapper = document.createElement('div');
  if (fd.Style) fieldWrapper.className = fd.Style;
  fieldWrapper.classList.add('field-wrapper', `${fd.Type}-wrapper`);

  fieldWrapper.dataset.fieldset = fd.Fieldset;

  return fieldWrapper;
}

const ids = [];
function generateFieldId(fd, suffix = '') {
  const slug = toClassName(`form-${fd.Name}${suffix}`);
  ids[slug] = ids[slug] || 0;
  const idSuffix = ids[slug] ? `-${ids[slug]}` : '';
  ids[slug] += 1;
  return `${slug}${idSuffix}`;
}

function createLabel(fd) {
  const label = document.createElement('label');
  label.id = generateFieldId(fd, '-label');
  label.textContent = fd.Label || fd.Name;
  label.setAttribute('for', fd.Id);
  if (fd.Mandatory.toLowerCase() === 'true' || fd.Mandatory.toLowerCase() === 'x') {
    label.dataset.required = true;
  }
  return label;
}

function setCommonAttributes(field, fd) {
  field.id = fd.Id;
  field.name = fd.Name;
  field.required = fd.Mandatory && (fd.Mandatory.toLowerCase() === 'true' || fd.Mandatory.toLowerCase() === 'x');
  field.placeholder = fd.Placeholder;
  field.value = fd.Value;
}

const createHeading = (fd) => {
  const fieldWrapper = createFieldWrapper(fd);

  const level = fd.Style && fd.Style.includes('sub-heading') ? 3 : 2;
  const heading = document.createElement(`h${level}`);
  heading.textContent = fd.Value || fd.Label;
  heading.id = fd.Id;

  fieldWrapper.append(heading);

  return { field: heading, fieldWrapper };
};

const createPlaintext = (fd) => {
  const fieldWrapper = createFieldWrapper(fd);

  const text = document.createElement('p');
  text.textContent = fd.Value || fd.Label;
  text.id = fd.Id;

  fieldWrapper.append(text);

  return { field: text, fieldWrapper };
};

const createSelect = async (fd) => {
  const select = document.createElement('select');
  setCommonAttributes(select, fd);
  const addOption = ({ text, value }) => {
    const option = document.createElement('option');
    option.text = text.trim();
    option.value = value.trim();
    if (option.value === fd.Value) {
      option.setAttribute('selected', '');
    }
    select.add(option);
    return option;
  };

  if (fd.Placeholder) {
    const ph = addOption({ text: fd.Placeholder, value: '' });
    ph.setAttribute('disabled', '');
  }

  if (fd.Options) {
    let options = [];
    if (fd.Options.startsWith('https://')) {
      const optionsUrl = new URL(fd.Options);
      const resp = await fetch(`${optionsUrl.pathname}${optionsUrl.search}`);
      const json = await resp.json();
      json.data.forEach((opt) => {
        options.push({
          text: opt.Option,
          value: opt.Value || opt.Option,
        });
      });
    } else {
      options = fd.Options.split(',').map((opt) => ({
        text: opt.trim(),
        value: opt.trim(),
      }));
    }

    options.forEach((opt) => addOption(opt));
  }

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.append(select);
  fieldWrapper.prepend(createLabel(fd));

  return { field: select, fieldWrapper };
};

const createConfirmation = (fd, form) => {
  form.dataset.confirmation = new URL(fd.Value).pathname;

  return {};
};

const createSubmit = (fd) => {
  const button = document.createElement('button');
  button.textContent = fd.Label || fd.Name;
  button.classList.add('button');
  button.type = 'submit';

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.append(button);
  return { field: button, fieldWrapper };
};

const createTextArea = (fd) => {
  const field = document.createElement('textarea');
  setCommonAttributes(field, fd);

  const fieldWrapper = createFieldWrapper(fd);
  const label = createLabel(fd);
  field.setAttribute('aria-labelledby', label.id);
  fieldWrapper.append(field);
  fieldWrapper.prepend(label);

  return { field, fieldWrapper };
};

const createInput = (fd) => {
  const field = document.createElement('input');
  field.type = fd.Type;
  setCommonAttributes(field, fd);

  const fieldWrapper = createFieldWrapper(fd);
  const label = createLabel(fd);
  field.setAttribute('aria-labelledby', label.id);
  fieldWrapper.append(field);
  if (fd.Type === 'radio' || fd.Type === 'checkbox') {
    fieldWrapper.append(label);
  } else {
    fieldWrapper.prepend(label);
  }

  return { field, fieldWrapper };
};

const createFieldset = (fd) => {
  const field = document.createElement('fieldset');
  setCommonAttributes(field, fd);

  if (fd.Label) {
    const legend = document.createElement('legend');
    legend.textContent = fd.Label;
    field.append(legend);
  }

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.append(field);

  return { field, fieldWrapper };
};

const createToggle = (fd) => {
  const { field, fieldWrapper } = createInput(fd);
  field.type = 'checkbox';
  if (!field.value) field.value = 'on';
  field.classList.add('toggle');
  fieldWrapper.classList.add('selection-wrapper');

  const toggleSwitch = document.createElement('div');
  toggleSwitch.classList.add('switch');
  toggleSwitch.append(field);
  fieldWrapper.append(toggleSwitch);

  const slider = document.createElement('span');
  slider.classList.add('slider');
  toggleSwitch.append(slider);
  slider.addEventListener('click', () => {
    field.checked = !field.checked;
  });

  return { field, fieldWrapper };
};

const createCheckbox = (fd) => {
  const { field, fieldWrapper } = createInput(fd);
  if (!field.value) field.value = 'checked';
  fieldWrapper.classList.add('selection-wrapper');

  return { field, fieldWrapper };
};

const createRadio = (fd) => {
  const { field, fieldWrapper } = createInput(fd);
  if (!field.value) field.value = fd.Label || 'on';
  fieldWrapper.classList.add('selection-wrapper');

  return { field, fieldWrapper };
};

const FIELD_CREATOR_FUNCTIONS = {
  select: createSelect,
  heading: createHeading,
  plaintext: createPlaintext,
  'text-area': createTextArea,
  toggle: createToggle,
  submit: createSubmit,
  confirmation: createConfirmation,
  fieldset: createFieldset,
  checkbox: createCheckbox,
  radio: createRadio,
};

export async function createField(fd, form) {
  fd.Id = fd.Id || generateFieldId(fd);
  const type = fd.Type.toLowerCase();
  const createFieldFunc = FIELD_CREATOR_FUNCTIONS[type] || createInput;
  const fieldElements = await createFieldFunc(fd, form);

  return fieldElements.fieldWrapper;
}

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {HTMLElement} The root element of the fragment
 */
// eslint-disable-next-line import/prefer-default-export
export async function loadFragment(path) {
  if (path && path.startsWith('/')) {
    // eslint-disable-next-line no-param-reassign
    path = path.replace(/(\.plain)?\.html/, '');
    const resp = await fetch(`${path}.plain.html`);
    if (resp.ok) {
      const main = document.createElement('main');
      main.innerHTML = await resp.text();

      // reset base path for media to fragment base
      const resetAttributeBase = (tag, attr) => {
        main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
          elem[attr] = new URL(elem.getAttribute(attr), new URL(path, window.location)).href;
        });
      };
      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      // Mark category-nav blocks to skip loading in fragments
      // They will be loaded explicitly when injected into the page
      const categoryNavBlocks = main.querySelectorAll('.category-nav');
      categoryNavBlocks.forEach((block) => {
        block.setAttribute('data-fragment-block', 'true');
      });

      // eslint-disable-next-line
      decorateMain(main);
      await loadSections(main);
      return main;
    }
  }
  return null;
}

export default async function decorateFragment(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();
  const fragment = await loadFragment(path);
  if (fragment) {
    const fragmentSection = fragment.querySelector(':scope .section');
    if (fragmentSection) {
      block.classList.add(...fragmentSection.classList);
      block.classList.remove('section');
      block.replaceChildren(...fragmentSection.childNodes);
    }
  }
}

/**
 * Check if we're viewing a framework page (either in Universal Editor or directly)
 * Framework pages are template/fragment pages and should display their raw content
 * @returns {boolean} True if viewing a framework page
 */
function isEditingFrameworkPage() {
  // Check if current path is in the framework folder
  // The path could be /framework/* or /content/idfc-edge/framework/*
  const isFrameworkPath = window.location.pathname.includes('/framework/');

  return isFrameworkPath;
}

/**
 * Load and inject category navigation fragment from page metadata
 * Reads the 'category-nav' page metadata field and injects the referenced fragment
 * @param {Element} main The main element
 */
async function loadCategoryNavFragment(main) {
  // Skip loading fragments when viewing framework pages
  // Framework pages are templates/fragments and should display their raw content
  if (isEditingFrameworkPage()) {
    return;
  }

  // Read the category-nav metadata value from the page
  const categoryNavPath = getMetadata('category-nav');
 
  if (!categoryNavPath) {
    return;
  }

  try {
    // Load the fragment content
    const fragment = await loadFragment(categoryNavPath);

    if (!fragment) {
      // eslint-disable-next-line no-console
      console.error(`[Category Nav Fragment] Failed to load fragment from: ${categoryNavPath}`);
      return;
    }

    // Get all sections from the fragment
    const fragmentSections = fragment.querySelectorAll(':scope > .section');

    if (fragmentSections.length === 0) {
      return;
    }

    // Insert all fragment sections at the beginning of main
    // They should be inserted before any existing content
    const { firstChild } = main;
    fragmentSections.forEach((section) => {
      // Clone the section to avoid moving it from the fragment
      const sectionClone = section.cloneNode(true);

      // Add semantic classes to sections containing category-nav blocks
      const categoryNavBlock = sectionClone.querySelector('.category-nav');
      if (categoryNavBlock) {
        // Remove the fragment-block marker so it can be loaded on the page
        categoryNavBlock.removeAttribute('data-fragment-block');
        // Reset block status so it can be loaded explicitly later
        categoryNavBlock.dataset.blockStatus = '';

        // Add class to identify this as a category navigation section
        sectionClone.classList.add('category-nav-section');

        // Find the category title and add a class
        const titleWrapper = sectionClone.querySelector('.default-content-wrapper');
        if (titleWrapper) {
          titleWrapper.classList.add('category-title-wrapper');
          const titleElement = titleWrapper.querySelector('p, h1, h2, h3, h4, h5, h6');
          if (titleElement) {
            titleElement.classList.add('category-title');
            // Add data attribute with the category name
            const categoryName = titleElement.textContent.trim();
            sectionClone.setAttribute('data-category-name', categoryName);
          }
        }

        // Add class to the wrapper containing the block
        const blockWrapper = sectionClone.querySelector('.category-nav-wrapper');
        if (blockWrapper) {
          blockWrapper.classList.add('category-nav-block-wrapper');
        }
      }

      if (firstChild) {
        main.insertBefore(sectionClone, firstChild);
      } else {
        main.appendChild(sectionClone);
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Category Nav Fragment] Error loading fragment:', error);
  }
}

/**
 * check if link text is same as the href
 * @param {Element} link the link element
 * @returns {boolean} true or false
 */
export function linkTextIncludesHref(link) {
  const href = link.getAttribute('href');
  const textcontent = link.textContent;

  return textcontent.includes(href);
}

/**
 * Builds 'embed' blocks when non-fragment links are encountered
 * @param {Element} main The container element
 */
export function buildEmbedBlocks(main) {
  const embedPlatforms = /youtu\.be|youtu|vimeo|twitter\.com/;
  main.querySelectorAll('a[href]').forEach((a) => {
    if (embedPlatforms.test(a.href) && linkTextIncludesHref(a)) {
      const embedBlock = buildBlock('embed', a.cloneNode(true));
      a.replaceWith(embedBlock);
      decorateBlock(embedBlock);
    }
  });
}

async function createForm(formHref, submitHref) {
  const { pathname } = new URL(formHref);
  const resp = await fetch(pathname);
  const json = await resp.json();

  const form = document.createElement('form');
  form.dataset.action = submitHref;

  const fields = await Promise.all(json.data.map((fd) => createField(fd, form)));
  fields.forEach((field) => {
    if (field) {
      form.append(field);
    }
  });

  // group fields into fieldsets
  const fieldsets = form.querySelectorAll('fieldset');
  fieldsets.forEach((fieldset) => {
    form.querySelectorAll(`[data-fieldset="${fieldset.name}"`).forEach((field) => {
      fieldset.append(field);
    });
  });

  return form;
}

function generatePayload(form) {
  const payload = {};

  [...form.elements].forEach((field) => {
    if (field.name && field.type !== 'submit' && !field.disabled) {
      if (field.type === 'radio') {
        if (field.checked) payload[field.name] = field.value;
      } else if (field.type === 'checkbox') {
        if (field.checked) payload[field.name] = payload[field.name] ? `${payload[field.name]},${field.value}` : field.value;
      } else {
        payload[field.name] = field.value;
      }
    }
  });
  return payload;
}

async function handleSubmit(form) {
  if (form.getAttribute('data-submitting') === 'true') return;

  const submit = form.querySelector('button[type="submit"]');
  try {
    form.setAttribute('data-submitting', 'true');
    submit.disabled = true;

    // create payload
    const payload = generatePayload(form);
    const response = await fetch(form.dataset.action, {
      method: 'POST',
      body: JSON.stringify({ data: payload }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      if (form.dataset.confirmation) {
        window.location.href = form.dataset.confirmation;
      }
    } else {
      const error = await response.text();
      throw new Error(error);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  } finally {
    form.setAttribute('data-submitting', 'false');
    submit.disabled = false;
  }
}

export async function decorateForm(block) {
  const formLink = block.querySelector('a').href;
  const submitLink = '/api';
  // if (!formLink || !submitLink) return;

  const form = await createForm(formLink, submitLink);
  block.replaceChildren(form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const valid = form.checkValidity();
    if (valid) {
      handleSubmit(form);
    } else {
      const firstInvalidEl = form.querySelector(':invalid:not(fieldset)');
      if (firstInvalidEl) {
        firstInvalidEl.focus();
        firstInvalidEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
}

function loadAutoBlock(doc) {
  doc.querySelectorAll('a').forEach((a) => {
    if (a && a.href && a.href.includes('/fragments/')) {
      decorateFragment(a.parentElement);
    } else if (a && a.href && a.href.includes('/forms/')) {
      decorateForm(a.parentElement);
    }
  });
}
/**
 * Extract section properties from Universal Editor data attributes
 * @param {Element} section The section element
 * @returns {Object} Object containing extracted properties
 */
function extractSectionPropertiesFromEditor(section) {
  const props = {};

  // Check for data-aue-prop attributes that might contain section properties
  const aueProps = Array.from(section.attributes).filter((attr) => attr.name.startsWith('data-aue-prop-'));
  aueProps.forEach((attr) => {
    const propName = attr.name.replace('data-aue-prop-', '');
    props[propName] = attr.value;
  });

  return props;
}

/**
 * Apply dynamic background colors and images to sections based on metadata
 * @param {Element} main The main element containing sections
 */
export function applySectionBackgroundColors(main) {
  main.querySelectorAll('.section').forEach((section) => {
    // Normalize backgroundColor data attribute variations
    // The HTML may serialize as data-backgroundcolor, data-background-color,
    // or data-backgroundColor. Ensure section.dataset.backgroundColor is set.
    const bgColorVariants = ['backgroundcolor', 'background-color'];
    bgColorVariants.forEach((variant) => {
      if (section.dataset[variant] && !section.dataset.backgroundColor) {
        section.dataset.backgroundColor = section.dataset[variant];
      }
    });

    // Normalize sectionBackgroundImage data attribute variations
    // The HTML may serialize as data-sectionbackgroundimage, data-section-background-image, etc.
    // Ensure we always have section.dataset.sectionBackgroundImage set for the JavaScript to use
    const bgImageVariants = ['sectionbackgroundimage', 'section-background-image'];
    bgImageVariants.forEach((variant) => {
      if (section.dataset[variant] && !section.dataset.sectionBackgroundImage) {
        section.dataset.sectionBackgroundImage = section.dataset[variant];
      }
    });

    let bgValue = null;
    let bgImageValue = null;

    // Check if backgroundColor is in dataset (from section-metadata block or data attribute)
    if (section.dataset.backgroundColor) {
      bgValue = section.dataset.backgroundColor.trim();
    }

    // Check if sectionBackgroundImage is in dataset
    if (section.dataset.sectionBackgroundImage) {
      bgImageValue = section.dataset.sectionBackgroundImage.trim();
    }

    // If not found, try to extract from Universal Editor properties (editor mode only)
    if (section.hasAttribute('data-aue-resource')) {
      const editorProps = extractSectionPropertiesFromEditor(section);

      if (!bgValue && (editorProps['background-color'] || editorProps.backgroundColor)) {
        bgValue = (editorProps['background-color'] || editorProps.backgroundColor).trim();
      }

      if (!bgImageValue && (editorProps['section-background-image'] || editorProps.sectionBackgroundImage)) {
        bgImageValue = (editorProps['section-background-image'] || editorProps.sectionBackgroundImage).trim();
      }
    }

    // If we found a background color value, process and apply it
    if (bgValue) {
      // If it looks like a hex color (3 or 6 characters, alphanumeric), prepend with #
      if (/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(bgValue)) {
        bgValue = `#${bgValue}`;
      }

      // Set as inline style
      section.style.backgroundColor = bgValue;
    }

    // If we found a background image value, apply it
    if (bgImageValue) {
      section.style.backgroundImage = `url('${bgImageValue}')`;
      section.style.backgroundSize = 'cover';
      section.style.backgroundPosition = 'center';
      section.style.backgroundRepeat = 'no-repeat';
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // TODO: add auto block, if needed
    loadAutoBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  applySectionBackgroundColors(main);
  decorateBlocks(main);
  buildEmbedBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    // Load category-nav fragment from page metadata BEFORE decorating main
    // This ensures the fragment sections are present when decorateMain runs
    await loadCategoryNavFragment(main);

    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Create category navbar wrapper at top of page
 * The actual navigation will be built by category-nav.js which collects all category-nav blocks
 *
 * Category nav content can come from:
 * 1. Page-level aem-content field (defined in _page.json) that references a fragment
 *    - The fragment is injected as sections/blocks directly into main
 * 2. Directly authored category-nav blocks on the page
 *
 * @param {Element} main The main element
 */
async function loadCategoryNav(main) {
  // Skip building navigation when viewing framework pages
  // Framework pages are templates/fragments and should display their raw content
  if (isEditingFrameworkPage()) {
    return;
  }

  // Check if there are any category-nav blocks on the page
  // These could be from:
  // - A fragment referenced by the page-level "category-nav" aem-content field
  // - Direct authoring of category-nav blocks on the page
  const categoryNavBlocks = main.querySelectorAll('.category-nav.block');

  if (categoryNavBlocks.length === 0) {
    return;
  }

  // Create category-nav wrapper at the top of main
  const categoryNavWrapper = document.createElement('div');
  categoryNavWrapper.classList.add('category-nav-wrapper');
  categoryNavWrapper.setAttribute('data-nav-placeholder', 'true');

  // Insert at the top of main
  main.insertBefore(categoryNavWrapper, main.firstChild);

  // Load CSS for the category nav
  const blockName = 'category-nav';
  try {
    await loadCSS(`${window.hlx.codeBasePath}/blocks/${blockName}/${blockName}.css`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Category Nav] Failed to load CSS:', error);
  }

  // Load ALL category-nav blocks together to ensure they all see each other
  // This is critical because the first block to load will build the unified navigation
  const navBlocksArray = Array.from(categoryNavBlocks);

  // Reset the unified nav flag in case blocks were partially decorated earlier
  // This ensures the first block we explicitly load will build the unified navigation
  try {
    const categoryNavModule = await import(`${window.hlx.codeBasePath}/blocks/category-nav/category-nav.js`);
    if (categoryNavModule.resetUnifiedNavFlag) {
      categoryNavModule.resetUnifiedNavFlag();
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Category Nav] Failed to reset flag:', error);
  }

  for (let i = 0; i < navBlocksArray.length; i += 1) {
    const navBlock = navBlocksArray[i];
    // Remove block status entirely to force fresh decoration
    delete navBlock.dataset.blockStatus;

    // eslint-disable-next-line no-await-in-loop
    await loadBlock(navBlock);
  }

  // Clean up: Remove the fragment sections from main
  // These were injected from the fragment but are no longer needed
  // since the navigation has been built and moved to the header
  const categoryNavSections = main.querySelectorAll('.category-nav-container');
  if (categoryNavSections.length > 0) {
    categoryNavSections.forEach((section) => {
      section.remove();
    });
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  autolinkModals(doc);
  const main = doc.querySelector('main');

  // Load header first so nav-wrapper is available for category navbar
  await loadHeader(doc.querySelector('header'));

  // Create category navbar wrapper BEFORE loading sections
  // This ensures the placeholder is in place when blocks are decorated
  await loadCategoryNav(main);

  // Now load all sections including category-nav blocks
  // The category-nav blocks will find the wrapper and populate it
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
  loadAutoBlock(doc);
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
