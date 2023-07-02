import restoreTheme from 'lib/restoreTheme';

/**
 * Confirm dialog box
 * @param {string} titleText Title text
 * @param {string} message Alert message
 * @returns {Promise<boolean>}
 */
function confirm(titleText, message) {
  return new Promise((resolve) => {
    if (!message && titleText) {
      message = titleText;
      titleText = '';
    }

    const titleSpan = tag('strong', {
      className: 'title',
      textContent: titleText,
    });
    const messageSpan = tag('span', {
      className: 'message scroll',
      textContent: message,
    });
    const okBtn = tag('button', {
      textContent: strings.ok,
      onclick: function () {
        hide();
        resolve(true);
      },
    });
    const cancelBtn = tag('button', {
      textContent: strings.cancel,
      onclick: function () {
        hide();
        resolve(false);
      },
    });
    const confirmDiv = tag('div', {
      className: 'prompt confirm',
      children: [
        titleSpan,
        messageSpan,
        tag('div', {
          className: 'button-container',
          children: [cancelBtn, okBtn],
        }),
      ],
    });
    const mask = tag('span', {
      className: 'mask',
    });

    actionStack.push({
      id: 'confirm',
      action: hideAlert,
    });

    app.append(confirmDiv, mask);
    restoreTheme(true);

    function hideAlert() {
      confirmDiv.classList.add('hide');
      restoreTheme();
      setTimeout(() => {
        app.removeChild(confirmDiv);
        app.removeChild(mask);
      }, 300);
    }

    function hide() {
      actionStack.remove('confirm');
      hideAlert();
    }
  });
}

export default confirm;