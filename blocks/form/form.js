/**
 * Form validation and handling for DOB and Mobile Number
 * Based on IDFC First Bank validation patterns
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
  
  const modalTitle = document.createElement('h5');
  modalTitle.className = 'modal-title';
  modalTitle.id = 'modal-title';
  modalTitle.textContent = 'User Verification';
  
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'close';
  closeButton.setAttribute('data-dismiss', 'modal');
  closeButton.setAttribute('aria-label', 'Close');
  
  const closeIcon = document.createElement('span');
  closeIcon.setAttribute('aria-hidden', 'true');
  closeIcon.innerHTML = '&times;';
  
  closeButton.appendChild(closeIcon);
  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButton);
  
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
  
  const dobInput = document.createElement('input');
  dobInput.type = 'date';
  dobInput.className = 'form-control';
  dobInput.id = 'date-of-birth';
  dobInput.name = 'date-of-birth';
  dobInput.required = true;
  
  // Set date constraints
  const today = new Date().toISOString().split('T')[0];
  dobInput.setAttribute('max', today);
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);
  dobInput.setAttribute('min', minDate.toISOString().split('T')[0]);
  
  dobGroup.appendChild(dobLabel);
  dobGroup.appendChild(dobInput);
  
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
  mobileInput.placeholder = 'Enter 10-digit mobile number';
  mobileInput.maxLength = 10;
  mobileInput.required = true;
  
  mobileGroup.appendChild(mobileLabel);
  mobileGroup.appendChild(mobileInput);
  
  // Create form actions
  const formActions = document.createElement('div');
  formActions.className = 'form-actions';
  
  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'btn-cancel';
  cancelButton.setAttribute('data-dismiss', 'modal');
  cancelButton.textContent = 'Cancel';
  
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'btn-submit';
  submitButton.id = 'submit-btn';
  submitButton.textContent = 'Submit';
  
  formActions.appendChild(cancelButton);
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
  
  // Initialize form after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeForm);
  } else {
    initializeForm();
  }
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

  // Validate date of birth
  validateDOB: function(dob) {
    if (!dob || dob.trim() === '') {
      return {
        valid: false,
        message: 'Date of birth is required'
      };
    }

    const dobDate = new Date(dob);
    const today = new Date();
    
    // Check if date is valid
    if (isNaN(dobDate.getTime())) {
      return {
        valid: false,
        message: 'Please enter a valid date'
      };
    }

    // Check if date is not in future
    if (dobDate > today) {
      return {
        valid: false,
        message: 'Date of birth cannot be in the future'
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
        message: 'Please enter a valid date of birth'
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
}

// Initialize form
function initializeForm() {
  // Initialize modal events
  initializeFormModal();
  
  // Setup field validation
  setupFieldValidation();
  
  // Handle form submission
  handleFormSubmission();
  
  // Handle trigger button clicks
  const triggerButtons = document.querySelectorAll('.open-verification-modal');
  triggerButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      showVerificationModal();
    });
  });
}

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
  
  if (form) {
    form.reset();
  }
  
  // Clear error messages
  const errorMessages = document.querySelectorAll('.error-message');
  errorMessages.forEach(msg => msg.style.display = 'none');
  
  // Remove error class from form controls
  const formControls = document.querySelectorAll('.form-control');
  formControls.forEach(control => control.classList.remove('error'));
  
  if (successMsg) successMsg.style.display = 'none';
  if (errorMsg) errorMsg.style.display = 'none';
}

// Validate form field on blur
function setupFieldValidation() {
  const mobileField = document.getElementById('mobile-number');
  const dobField = document.getElementById('date-of-birth');
  
  if (!mobileField || !dobField) return;
  
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

  // Clear error on focus
  const formControls = document.querySelectorAll('.form-control');
  formControls.forEach(control => {
    control.addEventListener('focus', function() {
      clearError(this.id);
    });
  });
}

// Handle form submission
function handleFormSubmission() {
  const form = document.getElementById('user-verification-form');
  if (!form) return;
  
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const mobileField = document.getElementById('mobile-number');
    const dobField = document.getElementById('date-of-birth');
    
    if (!mobileField || !dobField) return;
    
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

