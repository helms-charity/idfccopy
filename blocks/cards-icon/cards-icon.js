import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Cards-icon block: Important Documents, Related Search, and Image and Title variants only.
 * No Swiper carousel; grid layout only.
 * Card row: cell 0 = image+alt, cell 1 = cardContent (tag, text, link).
 */

function appendArrowIcon(cardBody) {
  if (cardBody.querySelector('.icon-arrow-right-white')) return;
  const arrowP = document.createElement('p');
  const arrowSpan = document.createElement('span');
  arrowSpan.className = 'icon icon-arrow-right-white';
  const arrowImg = document.createElement('img');
  arrowImg.setAttribute('data-icon-name', 'arrow-right-white');
  arrowImg.src = '/icons/arrow-right-white.svg';
  arrowImg.alt = 'arrow-right-white';
  arrowImg.loading = 'lazy';
  arrowSpan.appendChild(arrowImg);
  arrowP.appendChild(arrowSpan);
  cardBody.appendChild(arrowP);
}

function setupCardInteractivity(cardItem, shouldAddArrow = false) {
  const cardBodies = cardItem.querySelectorAll('.cards-card-body');
  if (cardBodies.length === 0) return;

  const mainBody = cardBodies[0];
  const cardLink = cardItem.querySelector('a[href]');
  if (!cardLink) return;

  cardItem.classList.add('card-clickable');
  cardItem.setAttribute('role', 'link');
  cardItem.setAttribute('tabindex', '0');

  const handleClick = (e) => {
    if (e.target.closest('a')) return;
    e.preventDefault();
    cardLink.click();
  };

  cardItem.addEventListener('click', handleClick);
  cardItem.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      cardLink.click();
    }
  });

  let buttonContainer = cardLink.closest('.button-container');
  if (!buttonContainer) {
    buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    cardLink.parentNode.insertBefore(buttonContainer, cardLink);
    buttonContainer.appendChild(cardLink);
  }
  buttonContainer.classList.add('sr-only');

  if (shouldAddArrow) appendArrowIcon(mainBody);
}

function splitCardContentCell(cardItem, contentCell) {
  const wrapper = contentCell.querySelector('div') || contentCell;
  const nodes = [...wrapper.children];
  const headingIndices = [];
  nodes.forEach((el, i) => {
    if (el.matches?.('h1, h2, h3, h4, h5, h6')) headingIndices.push(i);
  });

  let tagNodes;
  let bodyNodes;

  if (headingIndices.length > 0) {
    const firstHeadingIdx = headingIndices[0];
    const secondHeadingIdx = headingIndices[1] ?? nodes.length;
    tagNodes = firstHeadingIdx > 0 ? nodes.slice(0, firstHeadingIdx) : [];
    bodyNodes = nodes.slice(firstHeadingIdx, secondHeadingIdx);
  } else {
    if (nodes.length === 0) return;
    if (nodes.length === 1) {
      tagNodes = [];
      bodyNodes = nodes;
    } else {
      tagNodes = [nodes[0]];
      bodyNodes = nodes.slice(1);
    }
  }

  if (tagNodes.length > 0) {
    const tagDiv = document.createElement('div');
    tagDiv.className = 'cards-card-tag';
    tagNodes.forEach((n) => tagDiv.appendChild(n));
    cardItem.appendChild(tagDiv);
  }
  if (bodyNodes.length > 0) {
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'cards-card-body';
    bodyNodes.forEach((n) => bodyDiv.appendChild(n));
    cardItem.appendChild(bodyDiv);
  }
}

function buildCardFromTwoCells(row) {
  const cardItem = document.createElement('div');
  cardItem.classList.add('cards-card');
  moveInstrumentation(row, cardItem);

  const cells = [...row.children];
  if (cells.length < 2) return cardItem;

  const imageCell = cells[0].querySelector('div') || cells[0];
  const picture = imageCell.querySelector?.('picture');
  if (picture) {
    const imageWrap = document.createElement('div');
    imageWrap.className = 'cards-card-image';
    imageWrap.appendChild(picture);
    cardItem.appendChild(imageWrap);
  }

  splitCardContentCell(cardItem, cells[1]);
  return cardItem;
}

export default async function decorate(block) {
  const { classList } = block;
  const isImportantDocuments = classList.contains('important-documents');
  const isRelatedSearch = classList.contains('related-search');
  const isImageAndTitle = classList.contains('image-and-title');

  const rows = [...block.children];
  const cardRows = rows;

  const cardsContainer = document.createElement('div');
  cardsContainer.classList.add('grid-cards');

  cardRows.forEach((row, rowIndex) => {
    const numCells = row.querySelectorAll(':scope > div').length || row.children.length;
    if (numCells === 2) {
      const cardItem = buildCardFromTwoCells(row);
      cardsContainer.append(cardItem);
    } else {
      // eslint-disable-next-line no-console
      console.error(
        'Cards-icon block: card row has unexpected number of cells (expected 2, got %d). Row index: %d.',
        numCells,
        rowIndex,
      );
    }
  });

  const getStaticImageDimensions = (img) => {
    if (isImportantDocuments) return { width: 175, height: 175 };
    return null;
  };

  cardsContainer.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    const optimizedImg = optimizedPic.querySelector('img');
    moveInstrumentation(img, optimizedImg);

    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    if (width && height) {
      optimizedImg.setAttribute('width', width);
      optimizedImg.setAttribute('height', height);
    } else {
      const staticSize = getStaticImageDimensions(img);
      if (staticSize) {
        optimizedImg.setAttribute('width', staticSize.width);
        optimizedImg.setAttribute('height', staticSize.height);
      }
    }

    img.closest('picture').replaceWith(optimizedPic);
  });

  block.replaceChildren(cardsContainer);

  const allCards = cardsContainer.querySelectorAll('.cards-card');

  allCards.forEach((cardItem) => {
    if (isImportantDocuments) {
      cardItem.classList.add('important-documents-card');
    } else if (isRelatedSearch) {
      cardItem.classList.add('benefit-cards');
    }
    // image-and-title: no extra card class

    const shouldAddArrow = false;
    setupCardInteractivity(cardItem, shouldAddArrow);
  });

  block.append(cardsContainer);
}
