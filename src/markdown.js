/*! Licensed under MIT, https://github.com/sofish/pen */
(function(root) {

  // only works with Pen
  if (!root.Pen) return;

  // markdown converter obj
  let converter = {};

  // return valid markdown syntax
  converter.valid = function(str) {
    if (['#', '##', '###', '####', '#####', '######'].includes(str)) {
      return `h${str.length}`;
    } else if (str === '```') {
      return 'codeblock';
    } else if (str === '>') {
      return 'blockquote';
    } else if (str === '1.') {
      return 'insertorderedlist';
    } else if (str === '-' || str === '*') {
      return 'insertunorderedlist';
    } else if (str.match(/^(?:\.|\*|\-){3,}/)) {
      return 'inserthorizontalrule';
    }
  };

  // exec command
  converter.action = function(pen, cmd) {
    let { focusNode } = pen.selection;
    if (focusNode.parentNode !== pen.config.editor) {
      if (focusNode.textContent.length ===  pen.selection.getRangeAt(0).endOffset) {
        focusNode.parentNode.innerHTML = '<br>';
      } else {
        focusNode.textContent = focusNode.textContent.slice(pen.selection.getRangeAt(0).startOffset);
      }
    }
    pen.execCommand(cmd);
  };

  // init converter
  converter.init = function(pen) {
    pen.on('keypress', function(e) {
      let code = e.keyCode || e.which;
      if (code === 32) {
        let range = pen.getRange();
        let { startContainer, endContainer, startOffset, endOffset } = range;
        let { nodeValue } = pen.selection.focusNode;
        if (startContainer === endContainer && startOffset === endOffset && nodeValue) {
          let cmd = converter.valid(nodeValue.slice(0, startOffset));
          if (cmd) {
            // prevents leading space after executing command
            e.preventDefault();
            converter.action(pen, cmd);
          }
        }
      }
    });
  };

  // append to Pen
  root.Pen.prototype.markdown = converter;

}(window));
