/* eslint-disable */
/**
 * Form validation and handling for DOB and Mobile Number
 * Based on IDFC First Bank validation patterns
 * There are many errors in this code, but it's a starting point for a form validation and handling.
 */

/**
 * Decorates the form block by creating and appending form HTML
 * @param {Element} block The form block element
 */
export default function decorate(block) {
  // Clear the block
  block.textContent = '';

  // Create modal structure
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.id = 'user-verification-modal';
  modal.setAttribute('tabindex', '-1');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-labelledby', 'modal-title');
  modal.setAttribute('aria-hidden', 'true');

  // Create modal dialog
  const modalDialog = document.createElement('div');
  modalDialog.className = 'modal-dialog';
  modalDialog.setAttribute('role', 'document');

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';

  // Create modal header
  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';

  const modalTitle = document.createElement('h3');
  modalTitle.className = 'modal-title';
  modalTitle.id = 'modal-title';
  modalTitle.textContent = 'Login to activate UPI on your credit card';

  const modalDescription = document.createElement('p');
  modalDescription.className = 'modal-description';
  modalDescription.id = 'modal-description';
  modalDescription.textContent = 'Please enter the following details';

  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(modalDescription);

  // Create modal body
  const modalBody = document.createElement('div');
  modalBody.className = 'modal-body';

  // Create success message div
  const successMessage = document.createElement('div');
  successMessage.id = 'form-success-message';
  successMessage.style.display = 'none';

  // Create error message div
  const errorMessage = document.createElement('div');
  errorMessage.id = 'form-error-message';
  errorMessage.style.display = 'none';

  // Create form
  const form = document.createElement('form');
  form.id = 'user-verification-form';

  // Create DOB form group
  const dobGroup = document.createElement('div');
  dobGroup.className = 'form-group';

  const dobLabel = document.createElement('label');
  dobLabel.setAttribute('for', 'date-of-birth');
  dobLabel.innerHTML = 'Date of Birth <span class="required">*</span>';
  dobLabel.className = 'dob-label';

  const dobInput = document.createElement('input');
  dobInput.type = 'text';
  dobInput.className = 'form-control';
  dobInput.id = 'date-of-birth';
  dobInput.name = 'date-of-birth';
  dobInput.placeholder = 'Date of Birth (DD/MM/YYYY)*';
  dobInput.required = true;

  // Set date constraints
  const today = new Date().toISOString().split('T')[0];
  dobInput.setAttribute('max', today);
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);
  dobInput.setAttribute('min', minDate.toISOString().split('T')[0]);

  dobGroup.appendChild(dobInput);
  dobGroup.appendChild(dobLabel);

  // Create Mobile form group
  const mobileGroup = document.createElement('div');
  mobileGroup.className = 'form-group';

  const mobileLabel = document.createElement('label');
  mobileLabel.setAttribute('for', 'mobile-number');
  mobileLabel.innerHTML = 'Registered Mobile Number <span class="required">*</span>';

  const mobileInput = document.createElement('input');
  mobileInput.type = 'tel';
  mobileInput.className = 'form-control';
  mobileInput.id = 'mobile-number';
  mobileInput.name = 'mobile-number';
  mobileInput.placeholder = 'Enter 10-digit mobile number*';
  mobileInput.maxLength = 10;
  mobileInput.required = true;

  mobileGroup.appendChild(mobileInput);
  mobileGroup.appendChild(mobileLabel);

  // Create form actions
  const formActions = document.createElement('div');
  formActions.className = 'form-actions';

  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'btn-submit';
  submitButton.id = 'submit-btn';
  submitButton.textContent = 'Submit';

  formActions.appendChild(submitButton);

  // Assemble form
  form.appendChild(dobGroup);
  form.appendChild(mobileGroup);
  form.appendChild(formActions);

  // Assemble modal body
  modalBody.appendChild(successMessage);
  modalBody.appendChild(errorMessage);
  modalBody.appendChild(form);

  // Assemble modal content
  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);

  // Assemble modal dialog
  modalDialog.appendChild(modalContent);

  // Assemble modal
  modal.appendChild(modalDialog);

  // Append modal to block
  block.appendChild(modal);

  // Initialize form with element references
  initializeFormWithElements(modal, dobInput, mobileInput, form, submitButton);
}

// Initialize form with element references
function initializeFormWithElements(modal, dobInput, mobileInput, form, submitButton) {

  // Setup field validation with direct element references
  setupFieldValidationWithElements(dobInput, mobileInput);

  // Handle form submission with direct element references
  handleFormSubmissionWithElements(form, dobInput, mobileInput, submitButton);

  // Initialize modal events
  initializeFormModal();

  // Handle trigger button clicks
  const triggerButtons = document.querySelectorAll('.open-verification-modal');
  triggerButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      showVerificationModal();
    });
  });
}

// Validate form field on blur with element references
function setupFieldValidationWithElements(dobField, mobileField) {

  // Mobile number validation on blur
  mobileField.addEventListener('blur', function() {
    const mobile = this.value.trim();
    const validation = formValidation.validateMobile(mobile);

    if (!validation.valid) {
      showError('mobile-number', validation.message);
    } else {
      clearError('mobile-number');
    }
  });

  // Allow only numbers in mobile field
  mobileField.addEventListener('keypress', function(e) {
    const charCode = (e.which) ? e.which : e.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      e.preventDefault();
      return false;
    }
    return true;
  });

  // Limit mobile number to 10 digits
  mobileField.addEventListener('input', function() {
    if (this.value.length > 10) {
      this.value = this.value.slice(0, 10);
    }
  });

  // DOB validation on blur
  dobField.addEventListener('blur', function() {
    const dob = this.value.trim();
    const validation = formValidation.validateDOB(dob);

    if (!validation.valid) {
      showError('date-of-birth', validation.message);
    } else {
      clearError('date-of-birth');
    }
  });

  // Auto-format DOB input as DD/MM/YYYY
  dobField.addEventListener('input', function(e) {
    let value = this.value.replace(/\D/g, ''); // Remove non-digits

    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    if (value.length >= 5) {
      value = value.slice(0, 5) + '/' + value.slice(5);
    }
    if (value.length > 10) {
      value = value.slice(0, 10);
    }

    this.value = value;
  });

  // Restrict DOB input to numbers and slashes
  dobField.addEventListener('keypress', function(e) {
    const charCode = (e.which) ? e.which : e.keyCode;
    // Allow numbers (48-57) and forward slash (47)
    if (charCode !== 47 && (charCode < 48 || charCode > 57)) {
      e.preventDefault();
      return false;
    }
    return true;
  });

  // Reset labels on focus
  dobField.addEventListener('focus', function() {
    const dobLabel = document.querySelector('.dob-label');
    const dobErrorLabel = document.querySelector('.dob-error-label');
    if (dobLabel) dobLabel.style.display = 'block';
    if (dobErrorLabel) dobErrorLabel.style.display = 'none';
    clearError('date-of-birth');
  });

  // Clear error on focus
  const formControls = document.querySelectorAll('.form-control');
  formControls.forEach(control => {
    control.addEventListener('focus', function() {
      clearError(this.id);
    });
  });
}

// Handle form submission with element references
function handleFormSubmissionWithElements(form, dobField, mobileField, submitButton) {
  if (!form) {
    console.error('handleFormSubmission: form is null');
    return;
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    if (!mobileField || !dobField) {
      console.error('handleFormSubmission: mobileField or dobField is null');
      return;
    }

    // Get form values
    const mobile = mobileField.value.trim();
    const dob = dobField.value.trim();

    // Clear previous messages
    const successMsg = document.getElementById('form-success-message');
    const errorMsg = document.getElementById('form-error-message');
    if (successMsg) successMsg.style.display = 'none';
    if (errorMsg) errorMsg.style.display = 'none';

    // Validate all fields
    let isValid = true;

    // Validate mobile
    const mobileValidation = formValidation.validateMobile(mobile);
    if (!mobileValidation.valid) {
      showError('mobile-number', mobileValidation.message);
      isValid = false;
    } else {
      clearError('mobile-number');
    }

    // Validate DOB
    const dobValidation = formValidation.validateDOB(dob);
    if (!dobValidation.valid) {
      showError('date-of-birth', dobValidation.message);
      isValid = false;
    } else {
      clearError('date-of-birth');
    }

    // If form is valid, proceed with submission
    if (isValid) {
      submitForm(mobile, dob);
    } else {
      // Scroll to first error
      const firstError = document.querySelector('.form-control.error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return false;
  });
}

// Utility function for sanitizing inputs
function sanitize(string) {
  if (typeof (string) == "string") {
    const map = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
    };
    const reg = /[<>"']/ig;
    return string.replace(reg, (match) => (map[match]));
  } else {
    return string;
  }
}

// Validation functions
const formValidation = {
  // Validate mobile number (10 digits)
  validateMobile: function(mobile) {
    const mobilePattern = /^[6-9]\d{9}$/;
    if (!mobile || mobile.trim() === '') {
      return {
        valid: false,
        message: 'Mobile number is required'
      };
    }
    if (!mobilePattern.test(mobile)) {
      return {
        valid: false,
        message: 'Please enter a valid 10-digit mobile number'
      };
    }
    return {
      valid: true,
      message: ''
    };
  },

  // Validate date of birth in DD/MM/YYYY format
  validateDOB: function(dob) {
    if (!dob || dob.trim() === '') {
      return {
        valid: false,
        message: 'Date of birth is required'
      };
    }

    // Check format DD/MM/YYYY
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dob.match(datePattern);

    if (!match) {
      return {
        valid: false,
        message: 'Please enter date in DD/MM/YYYY format'
      };
    }

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // Check if date values are valid
    if (month < 1 || month > 12) {
      return {
        valid: false,
        message: 'Kindly enter a valid date'
      };
    }

    if (day < 1 || day > 31) {
      return {
        valid: false,
        message: 'Kindly enter a valid date'
      };
    }

    // Create date object (month is 0-indexed in JavaScript)
    const dobDate = new Date(year, month - 1, day);

    // Check if the date is actually valid (e.g., 31/02/2020 would be invalid)
    if (dobDate.getDate() !== day || dobDate.getMonth() !== month - 1 || dobDate.getFullYear() !== year) {
      return {
        valid: false,
        message: 'Kindly enter a valid date'
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

    // Check if date is not in future or today
    if (dobDate >= today) {
      return {
        valid: false,
        message: 'Date of birth must be earlier than today'
      };
    }

    // Calculate age (must be at least 18 years old)
    const age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    const dayDiff = today.getDate() - dobDate.getDate();

    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

    if (actualAge < 18) {
      return {
        valid: false,
        message: 'You must be at least 18 years old'
      };
    }

    if (actualAge > 100) {
      return {
        valid: false,
        message: 'Kindly enter a valid date'
      };
    }

    return {
      valid: true,
      message: ''
    };
  }
};

// Show error message
function showError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  const errorDiv = field.nextElementSibling;

  field.classList.add('error');

  if (errorDiv && errorDiv.classList.contains('error-message')) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  } else {
    const newErrorDiv = document.createElement('div');
    newErrorDiv.className = 'error-message';
    newErrorDiv.textContent = message;
    field.parentNode.insertBefore(newErrorDiv, field.nextSibling);
  }
  errorDiv.nextSibling.style.display = 'none';
}

// Clear error message
function clearError(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  field.classList.remove('error');
  const errorDiv = field.nextElementSibling;
  if (errorDiv && errorDiv.classList.contains('error-message')) {
    errorDiv.style.display = 'none';
  }
  errorDiv.nextSibling.style.display = 'block';
}

// Initialize form
// Initialize form modal
function initializeFormModal() {
  const modal = document.getElementById('user-verification-modal');
  if (!modal) return;

  // Handle modal show event (Bootstrap 3/4 compatible)
  if (typeof $ !== 'undefined' && $.fn.modal) {
    $('#user-verification-modal').on('show.bs.modal', function () {
      resetForm();
    });

    $('#user-verification-modal').on('hidden.bs.modal', function () {
      resetForm();
    });
  }
}

// Reset form
function resetForm() {
  const form = document.getElementById('user-verification-form');
  const successMsg = document.getElementById('form-success-message');
  const errorMsg = document.getElementById('form-error-message');
  const dobLabel = document.querySelector('.dob-label');
  const dobErrorLabel = document.querySelector('.dob-error-label');

  if (form) {
    form.reset();
  }

  // Reset DOB labels to initial state
  if (dobLabel) dobLabel.style.display = 'block';
  if (dobErrorLabel) dobErrorLabel.style.display = 'none';

  // Clear error messages
  const errorMessages = document.querySelectorAll('.error-message');
  errorMessages.forEach(msg => msg.style.display = 'none');

  // Remove error class from form controls
  const formControls = document.querySelectorAll('.form-control');
  formControls.forEach(control => control.classList.remove('error'));

  if (successMsg) successMsg.style.display = 'none';
  if (errorMsg) errorMsg.style.display = 'none';
}

// Submit form data
function submitForm(mobile, dob) {
  const submitBtn = document.getElementById('submit-btn');
  const successMsg = document.getElementById('form-success-message');
  const errorMsg = document.getElementById('form-error-message');

  if (!submitBtn) return;

  // Disable submit button
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  // Prepare form data
  const formData = {
    mobile: sanitize(mobile),
    dob: sanitize(dob),
    timestamp: new Date().toISOString()
  };

  // TODO: Replace with actual API endpoint
  // Example fetch call
  fetch('/api/verify-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData)
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Verification failed');
      }
      return response.json();
    })
    .then(data => {
      // Show success message
      if (successMsg) {
        successMsg.textContent = 'Verification successful!';
        successMsg.style.display = 'block';
      }

      // Reset form after 2 seconds
      setTimeout(() => {
        const modal = document.getElementById('user-verification-modal');
        if (modal) {
          // Close modal (Bootstrap compatible)
          if (typeof $ !== 'undefined' && $.fn.modal) {
            $('#user-verification-modal').modal('hide');
          } else if (modal.classList.contains('show')) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();
          }
        }
        resetForm();
      }, 2000);
    })
    .catch(error => {
      // Show error message
      if (errorMsg) {
        errorMsg.textContent = 'Verification failed. Please try again.';
        errorMsg.style.display = 'block';
      }
      console.error('Form submission error:', error);
    })
    .finally(() => {
      // Re-enable submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
      }
    });
}

// Show modal programmatically
function showVerificationModal() {
  const modal = document.getElementById('user-verification-modal');
  if (!modal) return;

  // Show modal (Bootstrap compatible)
  if (typeof $ !== 'undefined' && $.fn.modal) {
    $('#user-verification-modal').modal('show');
  } else {
    // Fallback for native implementation
    modal.classList.add('show');
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    document.body.appendChild(backdrop);
    document.body.classList.add('modal-open');

    // Handle close on backdrop click
    backdrop.addEventListener('click', () => {
      hideVerificationModal();
    });

    // Handle close button clicks
    const closeButtons = modal.querySelectorAll('[data-dismiss="modal"]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        hideVerificationModal();
      });
    });

    // Handle ESC key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        hideVerificationModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }
}

// Hide modal programmatically
function hideVerificationModal() {
  const modal = document.getElementById('user-verification-modal');
  if (!modal) return;

  modal.classList.remove('show');
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');

  const backdrop = document.querySelector('.modal-backdrop');
  if (backdrop) backdrop.remove();
  document.body.classList.remove('modal-open');

  resetForm();
}

// Export functions for external use
export {
  showVerificationModal,
  hideVerificationModal,
  resetForm,
  formValidation
};

