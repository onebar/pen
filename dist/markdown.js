'use strict';

/*! Licensed under MIT, https://github.com/sofish/pen */
(function (root) {

  // only works with Pen
  if (!root.Pen) return;

  // markdown converter obj
  var converter = {};

  // return valid markdown syntax
  converter.valid = function (str) {
    if (['#', '##', '###', '####', '#####', '######'].includes(str)) {
      return 'h' + str.length;
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
  converter.action = function (pen, cmd) {
    var focusNode = pen.selection.focusNode;

    if (focusNode.parentNode !== pen.config.editor) {
      if (focusNode.textContent.length === pen.selection.getRangeAt(0).endOffset) {
        focusNode.parentNode.innerHTML = '<br>';
      } else {
        focusNode.textContent = focusNode.textContent.slice(pen.selection.getRangeAt(0).startOffset);
      }
    }
    pen.execCommand(cmd);
  };

  // init converter
  converter.init = function (pen) {
    pen.on('keypress', function (e) {
      var code = e.keyCode || e.which;
      if (code === 32) {
        var range = pen.getRange();
        var startContainer = range.startContainer,
            endContainer = range.endContainer,
            startOffset = range.startOffset,
            endOffset = range.endOffset;
        var nodeValue = pen.selection.focusNode.nodeValue;

        if (startContainer === endContainer && startOffset === endOffset && nodeValue) {
          var cmd = converter.valid(nodeValue.slice(0, startOffset));
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
})(window);
//# sourceMappingURL=markdown.js.map
