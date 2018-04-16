'use strict';

var TurndownService = function () {
  'use strict';

  function extend(destination) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (source.hasOwnProperty(key)) destination[key] = source[key];
      }
    }
    return destination;
  }

  function repeat(character, count) {
    return Array(count + 1).join(character);
  }

  var blockElements = ['address', 'article', 'aside', 'audio', 'blockquote', 'body', 'canvas', 'center', 'dd', 'dir', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'html', 'isindex', 'li', 'main', 'menu', 'nav', 'noframes', 'noscript', 'ol', 'output', 'p', 'pre', 'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'];

  function isBlock(node) {
    return blockElements.indexOf(node.nodeName.toLowerCase()) !== -1;
  }

  var voidElements = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

  function isVoid(node) {
    return voidElements.indexOf(node.nodeName.toLowerCase()) !== -1;
  }

  var voidSelector = voidElements.join();
  function hasVoid(node) {
    return node.querySelector && node.querySelector(voidSelector);
  }

  var rules = {};

  rules.paragraph = {
    filter: 'p',

    replacement: function replacement(content) {
      return '\n\n' + content + '\n\n';
    }
  };

  rules.lineBreak = {
    filter: 'br',

    replacement: function replacement(content, node, options) {
      return options.br + '\n';
    }
  };

  rules.heading = {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],

    replacement: function replacement(content, node, options) {
      var hLevel = Number(node.nodeName.charAt(1));

      if (options.headingStyle === 'setext' && hLevel < 3) {
        var underline = repeat(hLevel === 1 ? '=' : '-', content.length);
        return '\n\n' + content + '\n' + underline + '\n\n';
      } else {
        return '\n\n' + repeat('#', hLevel) + ' ' + content + '\n\n';
      }
    }
  };

  rules.blockquote = {
    filter: 'blockquote',

    replacement: function replacement(content) {
      content = content.replace(/^\n+|\n+$/g, '');
      content = content.replace(/^/gm, '> ');
      return '\n\n' + content + '\n\n';
    }
  };

  rules.list = {
    filter: ['ul', 'ol'],

    replacement: function replacement(content, node) {
      var parent = node.parentNode;
      if (parent.nodeName === 'LI' && parent.lastElementChild === node) {
        return '\n' + content;
      } else {
        return '\n\n' + content + '\n\n';
      }
    }
  };

  rules.listItem = {
    filter: 'li',

    replacement: function replacement(content, node, options) {
      content = content.replace(/^\n+/, '') // remove leading newlines
      .replace(/\n+$/, '\n') // replace trailing newlines with just a single one
      .replace(/\n/gm, '\n    '); // indent
      var prefix = options.bulletListMarker + '   ';
      var parent = node.parentNode;
      if (parent.nodeName === 'OL') {
        var start = parent.getAttribute('start');
        var index = Array.prototype.indexOf.call(parent.children, node);
        prefix = (start ? Number(start) + index : index + 1) + '.  ';
      }
      return prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : '');
    }
  };

  rules.indentedCodeBlock = {
    filter: function filter(node, options) {
      return options.codeBlockStyle === 'indented' && node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
    },

    replacement: function replacement(content, node, options) {
      return '\n\n    ' + node.firstChild.textContent.replace(/\n/g, '\n    ') + '\n\n';
    }
  };

  rules.fencedCodeBlock = {
    filter: function filter(node, options) {
      return options.codeBlockStyle === 'fenced' && node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
    },

    replacement: function replacement(content, node, options) {
      var className = node.firstChild.className || '';
      var language = (className.match(/language-(\S+)/) || [null, ''])[1];

      return '\n\n' + options.fence + language + '\n' + node.firstChild.textContent + '\n' + options.fence + '\n\n';
    }
  };

  rules.horizontalRule = {
    filter: 'hr',

    replacement: function replacement(content, node, options) {
      return '\n\n' + options.hr + '\n\n';
    }
  };

  rules.inlineLink = {
    filter: function filter(node, options) {
      return options.linkStyle === 'inlined' && node.nodeName === 'A' && node.getAttribute('href');
    },

    replacement: function replacement(content, node) {
      var href = node.getAttribute('href');
      var title = node.title ? ' "' + node.title + '"' : '';
      return '[' + content + '](' + href + title + ')';
    }
  };

  rules.referenceLink = {
    filter: function filter(node, options) {
      return options.linkStyle === 'referenced' && node.nodeName === 'A' && node.getAttribute('href');
    },

    replacement: function replacement(content, node, options) {
      var href = node.getAttribute('href');
      var title = node.title ? ' "' + node.title + '"' : '';
      var replacement;
      var reference;

      switch (options.linkReferenceStyle) {
        case 'collapsed':
          replacement = '[' + content + '][]';
          reference = '[' + content + ']: ' + href + title;
          break;
        case 'shortcut':
          replacement = '[' + content + ']';
          reference = '[' + content + ']: ' + href + title;
          break;
        default:
          var id = this.references.length + 1;
          replacement = '[' + content + '][' + id + ']';
          reference = '[' + id + ']: ' + href + title;
      }

      this.references.push(reference);
      return replacement;
    },

    references: [],

    append: function append(options) {
      var references = '';
      if (this.references.length) {
        references = '\n\n' + this.references.join('\n') + '\n\n';
        this.references = []; // Reset references
      }
      return references;
    }
  };

  rules.emphasis = {
    filter: ['em', 'i'],

    replacement: function replacement(content, node, options) {
      if (!content.trim()) return '';
      return options.emDelimiter + content + options.emDelimiter;
    }
  };

  rules.strong = {
    filter: ['strong', 'b'],

    replacement: function replacement(content, node, options) {
      if (!content.trim()) return '';
      return options.strongDelimiter + content + options.strongDelimiter;
    }
  };

  rules.code = {
    filter: function filter(node) {
      var hasSiblings = node.previousSibling || node.nextSibling;
      var isCodeBlock = node.parentNode.nodeName === 'PRE' && !hasSiblings;

      return node.nodeName === 'CODE' && !isCodeBlock;
    },

    replacement: function replacement(content) {
      if (!content.trim()) return '';

      var delimiter = '`';
      var leadingSpace = '';
      var trailingSpace = '';
      var matches = content.match(/`+/gm);
      if (matches) {
        if (/^`/.test(content)) leadingSpace = ' ';
        if (/`$/.test(content)) trailingSpace = ' ';
        while (matches.indexOf(delimiter) !== -1) {
          delimiter = delimiter + '`';
        }
      }

      return delimiter + leadingSpace + content + trailingSpace + delimiter;
    }
  };

  rules.image = {
    filter: 'img',

    replacement: function replacement(content, node) {
      var alt = node.alt || '';
      var src = node.getAttribute('src') || '';
      var title = node.title || '';
      var titlePart = title ? ' "' + title + '"' : '';
      return src ? '![' + alt + ']' + '(' + src + titlePart + ')' : '';
    }
  };

  /**
   * Manages a collection of rules used to convert HTML to Markdown
   */

  function Rules(options) {
    this.options = options;
    this._keep = [];
    this._remove = [];

    this.blankRule = {
      replacement: options.blankReplacement
    };

    this.keepReplacement = options.keepReplacement;

    this.defaultRule = {
      replacement: options.defaultReplacement
    };

    this.array = [];
    for (var key in options.rules) {
      this.array.push(options.rules[key]);
    }
  }

  Rules.prototype = {
    add: function add(key, rule) {
      this.array.unshift(rule);
    },

    keep: function keep(filter) {
      this._keep.unshift({
        filter: filter,
        replacement: this.keepReplacement
      });
    },

    remove: function remove(filter) {
      this._remove.unshift({
        filter: filter,
        replacement: function replacement() {
          return '';
        }
      });
    },

    forNode: function forNode(node) {
      if (node.isBlank) return this.blankRule;
      var rule;

      if (rule = findRule(this.array, node, this.options)) return rule;
      if (rule = findRule(this._keep, node, this.options)) return rule;
      if (rule = findRule(this._remove, node, this.options)) return rule;

      return this.defaultRule;
    },

    forEach: function forEach(fn) {
      for (var i = 0; i < this.array.length; i++) {
        fn(this.array[i], i);
      }
    }
  };

  function findRule(rules, node, options) {
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (filterValue(rule, node, options)) return rule;
    }
    return void 0;
  }

  function filterValue(rule, node, options) {
    var filter = rule.filter;
    if (typeof filter === 'string') {
      if (filter === node.nodeName.toLowerCase()) return true;
    } else if (Array.isArray(filter)) {
      if (filter.indexOf(node.nodeName.toLowerCase()) > -1) return true;
    } else if (typeof filter === 'function') {
      if (filter.call(rule, node, options)) return true;
    } else {
      throw new TypeError('`filter` needs to be a string, array, or function');
    }
  }

  /**
   * The collapseWhitespace function is adapted from collapse-whitespace
   * by Luc Thevenard.
   *
   * The MIT License (MIT)
   *
   * Copyright (c) 2014 Luc Thevenard <lucthevenard@gmail.com>
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   *
   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   */

  /**
   * collapseWhitespace(options) removes extraneous whitespace from an the given element.
   *
   * @param {Object} options
   */
  function collapseWhitespace(options) {
    var element = options.element;
    var isBlock = options.isBlock;
    var isVoid = options.isVoid;
    var isPre = options.isPre || function (node) {
      return node.nodeName === 'PRE';
    };

    if (!element.firstChild || isPre(element)) return;

    var prevText = null;
    var prevVoid = false;

    var prev = null;
    var node = next(prev, element, isPre);

    while (node !== element) {
      if (node.nodeType === 3 || node.nodeType === 4) {
        // Node.TEXT_NODE or Node.CDATA_SECTION_NODE
        var text = node.data.replace(/[ \r\n\t]+/g, ' ');

        if ((!prevText || / $/.test(prevText.data)) && !prevVoid && text[0] === ' ') {
          text = text.substr(1);
        }

        // `text` might be empty at this point.
        if (!text) {
          node = remove(node);
          continue;
        }

        node.data = text;

        prevText = node;
      } else if (node.nodeType === 1) {
        // Node.ELEMENT_NODE
        if (isBlock(node) || node.nodeName === 'BR') {
          if (prevText) {
            prevText.data = prevText.data.replace(/ $/, '');
          }

          prevText = null;
          prevVoid = false;
        } else if (isVoid(node)) {
          // Avoid trimming space around non-block, non-BR void elements.
          prevText = null;
          prevVoid = true;
        }
      } else {
        node = remove(node);
        continue;
      }

      var nextNode = next(prev, node, isPre);
      prev = node;
      node = nextNode;
    }

    if (prevText) {
      prevText.data = prevText.data.replace(/ $/, '');
      if (!prevText.data) {
        remove(prevText);
      }
    }
  }

  /**
   * remove(node) removes the given node from the DOM and returns the
   * next node in the sequence.
   *
   * @param {Node} node
   * @return {Node} node
   */
  function remove(node) {
    var next = node.nextSibling || node.parentNode;

    node.parentNode.removeChild(node);

    return next;
  }

  /**
   * next(prev, current, isPre) returns the next node in the sequence, given the
   * current and previous nodes.
   *
   * @param {Node} prev
   * @param {Node} current
   * @param {Function} isPre
   * @return {Node}
   */
  function next(prev, current, isPre) {
    if (prev && prev.parentNode === current || isPre(current)) {
      return current.nextSibling || current.parentNode;
    }

    return current.firstChild || current.nextSibling || current.parentNode;
  }

  /*
   * Set up window for Node.js
   */

  var root = typeof window !== 'undefined' ? window : {};

  /*
   * Parsing HTML strings
   */

  function canParseHTMLNatively() {
    var Parser = root.DOMParser;
    var canParse = false;

    // Adapted from https://gist.github.com/1129031
    // Firefox/Opera/IE throw errors on unsupported types
    try {
      // WebKit returns null on unsupported types
      if (new Parser().parseFromString('', 'text/html')) {
        canParse = true;
      }
    } catch (e) {}

    return canParse;
  }

  function createHTMLParser() {
    var Parser = function Parser() {};

    {
      if (shouldUseActiveX()) {
        Parser.prototype.parseFromString = function (string) {
          var doc = new window.ActiveXObject('htmlfile');
          doc.designMode = 'on'; // disable on-page scripts
          doc.open();
          doc.write(string);
          doc.close();
          return doc;
        };
      } else {
        Parser.prototype.parseFromString = function (string) {
          var doc = document.implementation.createHTMLDocument('');
          doc.open();
          doc.write(string);
          doc.close();
          return doc;
        };
      }
    }
    return Parser;
  }

  function shouldUseActiveX() {
    var useActiveX = false;
    try {
      document.implementation.createHTMLDocument('').open();
    } catch (e) {
      if (window.ActiveXObject) useActiveX = true;
    }
    return useActiveX;
  }

  var HTMLParser = canParseHTMLNatively() ? root.DOMParser : createHTMLParser();

  function RootNode(input) {
    var root;
    if (typeof input === 'string') {
      var doc = htmlParser().parseFromString(
      // DOM parsers arrange elements in the <head> and <body>.
      // Wrapping in a custom element ensures elements are reliably arranged in
      // a single element.
      '<x-turndown id="turndown-root">' + input + '</x-turndown>', 'text/html');
      root = doc.getElementById('turndown-root');
    } else {
      root = input.cloneNode(true);
    }
    collapseWhitespace({
      element: root,
      isBlock: isBlock,
      isVoid: isVoid
    });

    return root;
  }

  var _htmlParser;
  function htmlParser() {
    _htmlParser = _htmlParser || new HTMLParser();
    return _htmlParser;
  }

  function Node(node) {
    node.isBlock = isBlock(node);
    node.isCode = node.nodeName.toLowerCase() === 'code' || node.parentNode.isCode;
    node.isBlank = isBlank(node);
    node.flankingWhitespace = flankingWhitespace(node);
    return node;
  }

  function isBlank(node) {
    return ['A', 'TH', 'TD'].indexOf(node.nodeName) === -1 && /^\s*$/i.test(node.textContent) && !isVoid(node) && !hasVoid(node);
  }

  function flankingWhitespace(node) {
    var leading = '';
    var trailing = '';

    if (!node.isBlock) {
      var hasLeading = /^[ \r\n\t]/.test(node.textContent);
      var hasTrailing = /[ \r\n\t]$/.test(node.textContent);

      if (hasLeading && !isFlankedByWhitespace('left', node)) {
        leading = ' ';
      }
      if (hasTrailing && !isFlankedByWhitespace('right', node)) {
        trailing = ' ';
      }
    }

    return { leading: leading, trailing: trailing };
  }

  function isFlankedByWhitespace(side, node) {
    var sibling;
    var regExp;
    var isFlanked;

    if (side === 'left') {
      sibling = node.previousSibling;
      regExp = / $/;
    } else {
      sibling = node.nextSibling;
      regExp = /^ /;
    }

    if (sibling) {
      if (sibling.nodeType === 3) {
        isFlanked = regExp.test(sibling.nodeValue);
      } else if (sibling.nodeType === 1 && !isBlock(sibling)) {
        isFlanked = regExp.test(sibling.textContent);
      }
    }
    return isFlanked;
  }

  var reduce = Array.prototype.reduce;
  var leadingNewLinesRegExp = /^\n*/;
  var trailingNewLinesRegExp = /\n*$/;

  function TurndownService(options) {
    if (!(this instanceof TurndownService)) return new TurndownService(options);

    var defaults = {
      rules: rules,
      headingStyle: 'setext',
      hr: '* * *',
      bulletListMarker: '*',
      codeBlockStyle: 'indented',
      fence: '```',
      emDelimiter: '_',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full',
      br: '  ',
      blankReplacement: function blankReplacement(content, node) {
        return node.isBlock ? '\n\n' : '';
      },
      keepReplacement: function keepReplacement(content, node) {
        return node.isBlock ? '\n\n' + node.outerHTML + '\n\n' : node.outerHTML;
      },
      defaultReplacement: function defaultReplacement(content, node) {
        return node.isBlock ? '\n\n' + content + '\n\n' : content;
      }
    };
    this.options = extend({}, defaults, options);
    this.rules = new Rules(this.options);
  }

  TurndownService.prototype = {
    /**
     * The entry point for converting a string or DOM node to Markdown
     * @public
     * @param {String|HTMLElement} input The string or DOM node to convert
     * @returns A Markdown representation of the input
     * @type String
     */

    turndown: function turndown(input) {
      if (!canConvert(input)) {
        throw new TypeError(input + ' is not a string, or an element/document/fragment node.');
      }

      if (input === '') return '';

      var output = process.call(this, new RootNode(input));
      return postProcess.call(this, output);
    },

    /**
     * Add one or more plugins
     * @public
     * @param {Function|Array} plugin The plugin or array of plugins to add
     * @returns The Turndown instance for chaining
     * @type Object
     */

    use: function use(plugin) {
      if (Array.isArray(plugin)) {
        for (var i = 0; i < plugin.length; i++) {
          this.use(plugin[i]);
        }
      } else if (typeof plugin === 'function') {
        plugin(this);
      } else {
        throw new TypeError('plugin must be a Function or an Array of Functions');
      }
      return this;
    },

    /**
     * Adds a rule
     * @public
     * @param {String} key The unique key of the rule
     * @param {Object} rule The rule
     * @returns The Turndown instance for chaining
     * @type Object
     */

    addRule: function addRule(key, rule) {
      this.rules.add(key, rule);
      return this;
    },

    /**
     * Keep a node (as HTML) that matches the filter
     * @public
     * @param {String|Array|Function} filter The unique key of the rule
     * @returns The Turndown instance for chaining
     * @type Object
     */

    keep: function keep(filter) {
      this.rules.keep(filter);
      return this;
    },

    /**
     * Remove a node that matches the filter
     * @public
     * @param {String|Array|Function} filter The unique key of the rule
     * @returns The Turndown instance for chaining
     * @type Object
     */

    remove: function remove(filter) {
      this.rules.remove(filter);
      return this;
    },

    /**
     * Escapes Markdown syntax
     * @public
     * @param {String} string The string to escape
     * @returns A string with Markdown syntax escaped
     * @type String
     */

    escape: function escape(string) {
      return string
      // Escape backslash escapes!
      .replace(/\\(\S)/g, '\\\\$1')

      // Escape headings
      .replace(/^(#{1,6} )/gm, '\\$1')

      // Escape hr
      .replace(/^([-*_] *){3,}$/gm, function (match, character) {
        return match.split(character).join('\\' + character);
      })

      // Escape ol bullet points
      .replace(/^(\W* {0,3})(\d+)\. /gm, '$1$2\\. ')

      // Escape ul bullet points
      .replace(/^([^\\\w]*)[*+-] /gm, function (match) {
        return match.replace(/([*+-])/g, '\\$1');
      })

      // Escape blockquote indents
      .replace(/^(\W* {0,3})> /gm, '$1\\> ')

      // Escape em/strong *
      .replace(/\*+(?![*\s\W]).+?\*+/g, function (match) {
        return match.replace(/\*/g, '\\*');
      })

      // Escape em/strong _
      .replace(/_+(?![_\s\W]).+?_+/g, function (match) {
        return match.replace(/_/g, '\\_');
      })

      // Escape code _
      .replace(/`+(?![`\s\W]).+?`+/g, function (match) {
        return match.replace(/`/g, '\\`');
      })

      // Escape link brackets
      .replace(/[\[\]]/g, '\\$&') // eslint-disable-line no-useless-escape
      ;
    }
  };

  /**
   * Reduces a DOM node down to its Markdown string equivalent
   * @private
   * @param {HTMLElement} parentNode The node to convert
   * @returns A Markdown representation of the node
   * @type String
   */

  function process(parentNode) {
    var self = this;
    return reduce.call(parentNode.childNodes, function (output, node) {
      node = new Node(node);

      var replacement = '';
      if (node.nodeType === 3) {
        replacement = node.isCode ? node.nodeValue : self.escape(node.nodeValue);
      } else if (node.nodeType === 1) {
        replacement = replacementForNode.call(self, node);
      }

      return join(output, replacement);
    }, '');
  }

  /**
   * Appends strings as each rule requires and trims the output
   * @private
   * @param {String} output The conversion output
   * @returns A trimmed version of the ouput
   * @type String
   */

  function postProcess(output) {
    var self = this;
    this.rules.forEach(function (rule) {
      if (typeof rule.append === 'function') {
        output = join(output, rule.append(self.options));
      }
    });

    return output.replace(/^[\t\r\n]+/, '').replace(/[\t\r\n\s]+$/, '');
  }

  /**
   * Converts an element node to its Markdown equivalent
   * @private
   * @param {HTMLElement} node The node to convert
   * @returns A Markdown representation of the node
   * @type String
   */

  function replacementForNode(node) {
    var rule = this.rules.forNode(node);
    var content = process.call(this, node);
    var whitespace = node.flankingWhitespace;
    if (whitespace.leading || whitespace.trailing) content = content.trim();
    return whitespace.leading + rule.replacement(content, node, this.options) + whitespace.trailing;
  }

  /**
   * Determines the new lines between the current output and the replacement
   * @private
   * @param {String} output The current conversion output
   * @param {String} replacement The string to append to the output
   * @returns The whitespace to separate the current output and the replacement
   * @type String
   */

  function separatingNewlines(output, replacement) {
    var newlines = [output.match(trailingNewLinesRegExp)[0], replacement.match(leadingNewLinesRegExp)[0]].sort();
    var maxNewlines = newlines[newlines.length - 1];
    return maxNewlines.length < 2 ? maxNewlines : '\n\n';
  }

  function join(string1, string2) {
    var separator = separatingNewlines(string1, string2);

    // Remove trailing/leading newlines and replace with separator
    string1 = string1.replace(trailingNewLinesRegExp, '');
    string2 = string2.replace(leadingNewLinesRegExp, '');

    return string1 + separator + string2;
  }

  /**
   * Determines whether an input can be converted
   * @private
   * @param {String|HTMLElement} input Describe this parameter
   * @returns Describe what it returns
   * @type String|Object|Array|Boolean|Number
   */

  function canConvert(input) {
    return input != null && (typeof input === 'string' || input.nodeType && (input.nodeType === 1 || input.nodeType === 9 || input.nodeType === 11));
  }

  return TurndownService;
}();
; /*! Licensed under MIT, https://github.com/sofish/pen */
/* global TurndownService */
(function (root, doc) {
  var debugMode = void 0;
  var selection = void 0;
  var utils = {};
  var toString = Object.prototype.toString;
  var slice = Array.prototype.slice;

  // allow command list
  var commandsReg = {
    block: /^(?:p|h[1-6]|blockquote)$/,
    inline: /^(?:bold|italic|underline|insertorderedlist|insertunorderedlist|indent|outdent)$/,
    source: /^(?:createlink|unlink)$/,
    insert: /^(?:inserthorizontalrule|insertimage|insert)$/,
    wrap: /^(?:code)$/
  };

  var lineBreakReg = /^(?:blockquote|pre|div|code)$/i;

  var effectNodeReg = /(?:[pubia]|h[1-6]|blockquote|[uo]l|li|code)/i;

  var strReg = {
    whiteSpace: /(^\s+)|(\s+$)/g,
    mailTo: /^(?!mailto:|.+\/|.+#|.+\?)(.*@.*\..+)$/,
    http: /^(?!\w+?:\/\/|mailto:|\/|\.\/|\?|#)(.*)$/
  };

  var autoLinkReg = {
    url: /((https?|ftp):\/\/|www\.)[^\s<]{3,}/gi,
    prefix: /^(?:https?|ftp):\/\//i,
    notLink: /^(?:img|a|input|audio|video|source|code|pre|script|head|title|style)$/i,
    maxLength: 100
  };

  // type detect
  utils.is = function (obj, type) {
    return toString.call(obj).slice(8, -1) === type;
  };

  utils.forEach = function (obj, iterator, arrayLike) {
    if (!obj) return;
    if (arrayLike == null) arrayLike = utils.is(obj, 'Array');
    if (arrayLike) {
      for (var i = 0, l = obj.length; i < l; i++) {
        iterator(obj[i], i, obj);
      }
    } else {
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) iterator(obj[key], key, obj);
      }
    }
  };

  // copy props from a obj
  utils.copy = function (defaults, source) {
    utils.forEach(source, function (value, key) {
      if (utils.is(value, 'Object')) {
        defaults[key] = utils.copy({}, value);
      } else if (utils.is(value, 'Array')) {
        defaults[key] = utils.copy([], value);
      } else {
        defaults[key] = value;
      }
    });

    return defaults;
  };

  // log
  utils.log = function (message, force) {
    if (debugMode || force) console.log('%cPEN DEBUGGER: %c' + message, 'font-family:arial,sans-serif;color:#1abf89;line-height:2em;', 'font-family:cursor,monospace;color:#333;');
  };

  utils.delayExec = function (fn) {
    var timer = null;

    return function (delay) {
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn();
      }, delay || 1);
    };
  };

  // merge: make it easy to have a fallback
  utils.merge = function (config) {
    // default settings
    var defaults = {
      class: 'pen',
      debug: false,
      toolbar: null, // custom toolbar
      stay: config.stay || !config.debug,
      stayMsg: 'Are you going to leave here?',
      textarea: '<textarea name="content"></textarea>',
      list: ['blockquote', 'h2', 'h3', 'p', 'code', 'insertorderedlist', 'insertunorderedlist', 'inserthorizontalrule', 'indent', 'outdent', 'bold', 'italic', 'underline', 'createlink', 'insertimage'],
      titles: {},
      cleanAttrs: ['id', 'class', 'style', 'name'],
      cleanTags: ['script'],
      linksInNewWindow: false
    };

    // user-friendly config
    if (config.nodeType === 1) {
      defaults.editor = config;
    } else if (config.match && config.match(/^#[\S]+$/)) {
      defaults.editor = doc.getElementById(config.slice(1));
    } else {
      defaults = utils.copy(defaults, config);
    }

    return defaults;
  };

  function commandOverall(ctx, cmd, val) {
    var message = ' to exec \u300C' + cmd + '\u300D command' + (val ? ' with value: ' + val : '');

    try {
      doc.execCommand(cmd, false, val);
    } catch (err) {
      // TODO: there's an error when insert a image to document, but not a bug
      return utils.log('fail' + message, true);
    }

    utils.log('success' + message);
  }

  function commandInsert(ctx, name, val) {
    var node = getNode(ctx);

    if (!node) return;
    ctx._range.selectNode(node);
    ctx._range.collapse(false);

    // hide menu when a image was inserted
    if (name === 'insertimage' && ctx._menu) toggleNode(ctx._menu, true);

    return commandOverall(ctx, name, val);
  }

  function commandBlock(ctx, name) {
    var list = effectNode(ctx, getNode(ctx), true);

    if (list.indexOf(name) !== -1) name = 'p';

    return commandOverall(ctx, 'formatblock', name);
  }

  function commandWrap(ctx, tag, value) {
    value = '<' + tag + '>' + (value || selection.toString()) + '</' + tag + '>';

    return commandOverall(ctx, 'insertHTML', value);
  }

  function commandLink(ctx, tag, value) {
    if (ctx.config.linksInNewWindow) {
      value = '<a href="' + value + '" target="_blank">' + selection.toString() + '</a>';

      return commandOverall(ctx, 'insertHTML', value);
    } else {
      return commandOverall(ctx, tag, value);
    }
  }

  function initToolbar(ctx) {
    var icons = '';
    var inputStr = '<input class="pen-input" placeholder="http://" />';

    ctx._toolbar = ctx.config.toolbar;
    if (!ctx._toolbar) {
      var toolList = ctx.config.list;

      utils.forEach(toolList, function (name) {
        var klass = 'pen-icon icon-' + name;
        var title = ctx.config.titles[name] || '';

        icons += '<i class="' + klass + '" data-action="' + name + '" title="' + title + '"></i>';
      }, true);
      if (toolList.indexOf('createlink') >= 0 || toolList.indexOf('insertimage') >= 0) icons += inputStr;
    } else if (ctx._toolbar.querySelectorAll('[data-action=createlink]').length || ctx._toolbar.querySelectorAll('[data-action=insertimage]').length) {
      icons += inputStr;
    }

    if (icons) {
      ctx._menu = doc.createElement('div');
      ctx._menu.setAttribute('class', ctx.config.class + '-menu pen-menu');
      ctx._menu.innerHTML = icons;
      ctx._inputBar = ctx._menu.querySelector('input');
      toggleNode(ctx._menu, true);
      doc.body.appendChild(ctx._menu);
    }
    if (ctx._toolbar && ctx._inputBar) toggleNode(ctx._inputBar);
  }

  function initEvents(ctx) {
    var toolbar = ctx._toolbar || ctx._menu;
    var editor = ctx.config.editor;

    var toggleMenu = utils.delayExec(function () {
      ctx.highlight().menu();
    });
    var _outsideClick = function outsideClick() {};

    function updateStatus(delay) {
      ctx._range = ctx.getRange();
      toggleMenu(delay);
    }

    if (ctx._menu) {
      var setpos = function setpos() {
        if (ctx._menu.style.display === 'block') ctx.menu();
      };

      // change menu offset when window resize / scroll
      addListener(ctx, root, 'resize', setpos);
      addListener(ctx, root, 'scroll', setpos);

      // toggle toolbar on mouse select
      var selecting = false;

      addListener(ctx, editor, 'mousedown', function () {
        selecting = true;
      });
      addListener(ctx, editor, 'mouseleave', function () {
        if (selecting) updateStatus(800);
        selecting = false;
      });
      addListener(ctx, editor, 'mouseup', function () {
        if (selecting) updateStatus(100);
        selecting = false;
      });
      // Hide menu when focusing outside of editor
      _outsideClick = function outsideClick(e) {
        if (ctx._menu && ctx._menu.style.display === 'block' && !containsNode(editor, e.target) && !containsNode(ctx._menu, e.target)) {
          removeListener(ctx, doc, 'click', _outsideClick);
          toggleMenu(100);
        }
      };
    } else {
      addListener(ctx, editor, 'click', function () {
        updateStatus(0);
      });
    }

    addListener(ctx, editor, 'keyup', function (e) {
      if (e.which === 8 && ctx.isEmpty()) return lineBreak(ctx, true);
    });

    // check line break
    addListener(ctx, editor, 'keydown', function (e) {
      editor.classList.remove('pen-placeholder');
      if (e.which !== 13 || e.shiftKey) return;
      var node = getNode(ctx, true);

      if (!node || !lineBreakReg.test(node.nodeName)) return;
      if (node.nodeName === 'CODE') {
        node = node.parentNode;
      }
      // quit block mode for 2 'enter'
      e.preventDefault();
      var p = doc.createElement('p');

      p.innerHTML = '<br>';
      if (!node.nextSibling) node.parentNode.appendChild(p);else node.parentNode.insertBefore(p, node.nextSibling);
      focusNode(ctx, p, ctx.getRange());
    });

    var menuApply = function menuApply(action, value) {
      ctx.execCommand(action, value);
      ctx._range = ctx.getRange();
      ctx.highlight().menu();
    };

    // toggle toolbar on key select
    addListener(ctx, toolbar, 'click', function (e) {
      var node = e.target;
      var action = void 0;

      while (node !== toolbar && !(action = node.getAttribute('data-action'))) {
        node = node.parentNode;
      }

      if (!action) return;
      if (!/(?:createlink)|(?:insertimage)/.test(action)) return menuApply(action);
      if (!ctx._inputBar) return;

      // create link
      var input = ctx._inputBar;

      if (toolbar === ctx._menu) toggleNode(input);else {
        ctx._inputActive = true;
        ctx.menu();
      }
      if (ctx._menu.style.display === 'none') return;

      setTimeout(function () {
        input.focus();
      }, 400);
      var createlink = function createlink() {
        var inputValue = input.value;

        if (!inputValue) action = 'unlink';else {
          inputValue = input.value.replace(strReg.whiteSpace, '').replace(strReg.mailTo, 'mailto:$1').replace(strReg.http, 'http://$1');
        }
        menuApply(action, inputValue);
        if (toolbar === ctx._menu) toggleNode(input, false);else toggleNode(ctx._menu, true);
      };

      input.onkeypress = function (e) {
        if (e.which === 13) return createlink();
      };
    });

    // listen for placeholder
    addListener(ctx, editor, 'focus', function () {
      if (ctx.isEmpty()) lineBreak(ctx, true);
      addListener(ctx, doc, 'click', _outsideClick);
    });

    addListener(ctx, editor, 'blur', function () {
      checkPlaceholder(ctx);
      ctx.checkContentChange();
    });

    // listen for paste and clear style
    addListener(ctx, editor, 'paste', function () {
      setTimeout(function () {
        ctx.cleanContent();
      });
    });
  }

  function addListener(ctx, target, type, listener) {
    if (ctx._events.hasOwnProperty(type)) {
      ctx._events[type].push(listener);
    } else {
      ctx._eventTargets = ctx._eventTargets || [];
      ctx._eventsCache = ctx._eventsCache || [];
      var index = ctx._eventTargets.indexOf(target);

      if (index < 0) index = ctx._eventTargets.push(target) - 1;
      ctx._eventsCache[index] = ctx._eventsCache[index] || {};
      ctx._eventsCache[index][type] = ctx._eventsCache[index][type] || [];
      ctx._eventsCache[index][type].push(listener);

      target.addEventListener(type, listener, false);
    }

    return ctx;
  }

  // trigger local events
  function triggerListener(ctx, type) {
    if (!ctx._events.hasOwnProperty(type)) return;
    var args = slice.call(arguments, 2);

    utils.forEach(ctx._events[type], function (listener) {
      listener.apply(ctx, args);
    });
  }

  function removeListener(ctx, target, type, listener) {
    var events = ctx._events[type];

    if (!events) {
      var _index = ctx._eventTargets.indexOf(target);

      if (_index >= 0) events = ctx._eventsCache[_index][type];
    }
    if (!events) return ctx;
    var index = events.indexOf(listener);

    if (index >= 0) events.splice(index, 1);
    target.removeEventListener(type, listener, false);

    return ctx;
  }

  function removeAllListeners(ctx) {
    utils.forEach(this._events, function (events) {
      events.length = 0;
    }, false);
    if (!ctx._eventsCache) return ctx;
    utils.forEach(ctx._eventsCache, function (events, index) {
      var target = ctx._eventTargets[index];

      utils.forEach(events, function (listeners, type) {
        utils.forEach(listeners, function (listener) {
          target.removeEventListener(type, listener, false);
        }, true);
      }, false);
    }, true);
    ctx._eventTargets = [];
    ctx._eventsCache = [];

    return ctx;
  }

  function checkPlaceholder(ctx) {
    ctx.config.editor.classList[ctx.isEmpty() ? 'add' : 'remove']('pen-placeholder');
  }

  function trim(str) {
    return (str || '').replace(/^\s+|\s+$/g, '');
  }

  // node.contains is not implemented in IE10/IE11
  function containsNode(parent, child) {
    if (parent === child) return true;
    child = child.parentNode;
    while (child) {
      if (child === parent) return true;
      child = child.parentNode;
    }

    return false;
  }

  function getNode(ctx, byRoot) {
    var node = void 0;
    var root = ctx.config.editor;

    ctx._range = ctx.getRange();
    node = ctx._range.commonAncestorContainer;
    if (!node || node === root) return null;
    while (node && node.nodeType !== 1 && node.parentNode !== root) {
      node = node.parentNode;
    }if (byRoot) {
      while (node && node.parentNode !== root) {
        node = node.parentNode;
      }
    }

    return containsNode(root, node) ? node : null;
  }

  // node effects
  function effectNode(ctx, el, returnAsNodeName) {
    var nodes = [];

    el = el || ctx.config.editor;
    while (el && el !== ctx.config.editor) {
      if (el.nodeName.match(effectNodeReg)) {
        nodes.push(returnAsNodeName ? el.nodeName.toLowerCase() : el);
      }
      el = el.parentNode;
    }

    return nodes;
  }

  // breakout from node
  function lineBreak(ctx, empty) {
    var range = ctx._range = ctx.getRange();
    var node = doc.createElement('p');

    if (empty) ctx.config.editor.innerHTML = '';
    node.innerHTML = '<br>';
    range.insertNode(node);
    focusNode(ctx, node.childNodes[0], range);
  }

  function focusNode(ctx, node, range) {
    range.setStartAfter(node);
    range.setEndBefore(node);
    range.collapse(false);
    ctx.setRange(range);
  }

  function autoLink(node) {
    if (node.nodeType === 1) {
      if (autoLinkReg.notLink.test(node.tagName)) return;
      utils.forEach(node.childNodes, function (child) {
        autoLink(child);
      }, true);
    } else if (node.nodeType === 3) {
      var result = urlToLink(node.nodeValue || '');

      if (!result.links) return;
      var frag = doc.createDocumentFragment();
      var div = doc.createElement('div');

      div.innerHTML = result.text;
      while (div.childNodes.length) {
        frag.appendChild(div.childNodes[0]);
      }node.parentNode.replaceChild(frag, node);
    }
  }

  function urlToLink(str) {
    var count = 0;

    str = str.replace(autoLinkReg.url, function (url) {
      var realUrl = url;
      var displayUrl = url;

      count++;
      if (url.length > autoLinkReg.maxLength) displayUrl = url.slice(0, autoLinkReg.maxLength) + '...';
      // Add http prefix if necessary
      if (!autoLinkReg.prefix.test(realUrl)) realUrl = 'http://' + realUrl;

      return '<a href="' + realUrl + '">' + displayUrl + '</a>';
    });

    return { links: count, text: str };
  }

  function toggleNode(node, hide) {
    node.style.display = hide ? 'none' : 'block';
  }

  function nextNode(node) {
    if (node.hasChildNodes()) {
      return node.firstChild;
    } else {
      while (node && !node.nextSibling) {
        node = node.parentNode;
      }
      if (!node) {
        return null;
      }

      return node.nextSibling;
    }
  }

  function getRangeSelectedNodes(range) {
    var node = range.startContainer;
    var endNode = range.endContainer;

    // Special case for a range that is contained within a single node
    if (node === endNode) {
      return [node];
    }

    // Iterate nodes until we hit the end container
    var rangeNodes = [];

    while (node && node !== endNode) {
      rangeNodes.push(node = nextNode(node));
    }

    // Add partially selected nodes at the start of the range
    node = range.startContainer;
    while (node && node !== range.commonAncestorContainer) {
      rangeNodes.unshift(node);
      node = node.parentNode;
    }

    return rangeNodes;
  }

  var Pen = function Pen(config) {
    if (!config) throw new Error("Can't find config");

    debugMode = config.debug;

    // merge user config
    var defaults = utils.merge(config);

    var editor = defaults.editor;

    if (!editor || editor.nodeType !== 1) throw new Error("Can't find editor");

    // set default class
    editor.classList.add(defaults.class);

    // set contenteditable
    editor.setAttribute('contenteditable', 'true');

    // assign config
    this.config = defaults;

    // set placeholder
    if (defaults.placeholder) editor.setAttribute('data-placeholder', defaults.placeholder);
    checkPlaceholder(this);

    // save the selection obj
    this.selection = selection;

    // define local events
    this._events = { change: [] };

    // enable toolbar
    initToolbar(this);

    // init events
    initEvents(this);

    // to check content change
    this._prevContent = this.getContent();

    // enable markdown covert
    if (this.markdown) this.markdown.init(this);

    // stay on the page
    if (this.config.stay) this.stay(this.config);

    if (this.config.input) {
      this.addOnSubmitListener(this.config.input);
    }
  };

  Pen.prototype.on = function (type, listener) {
    addListener(this, this.config.editor, type, listener);

    return this;
  };

  Pen.prototype.addOnSubmitListener = function (inputElement) {
    var form = inputElement.form;
    var me = this;

    form.addEventListener('submit', function () {
      inputElement.value = me.config.editor.innerHTML;
    });
  };

  Pen.prototype.isEmpty = function (node) {
    node = node || this.config.editor;

    return !node.querySelector('img') && !node.querySelector('blockquote') && !node.querySelector('li') && !trim(node.textContent);
  };

  Pen.prototype.getContent = function () {
    return this.isEmpty() ? '' : trim(this.config.editor.innerHTML);
  };

  Pen.prototype.setContent = function (html) {
    this.config.editor.innerHTML = html;
    this.cleanContent();

    return this;
  };

  Pen.prototype.checkContentChange = function () {
    var prevContent = this._prevContent;
    var currentContent = this.getContent();

    if (prevContent === currentContent) return;
    this._prevContent = currentContent;
    triggerListener(this, 'change', currentContent, prevContent);
  };

  Pen.prototype.getRange = function () {
    var editor = this.config.editor;
    var range = selection.rangeCount && selection.getRangeAt(0);

    if (!range || !containsNode(editor, range.commonAncestorContainer)) {
      range = doc.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    return range;
  };

  Pen.prototype.setRange = function (range) {
    range = range || this._range;
    if (!range) {
      range = this.getRange();
      range.collapse(false); // set to end
    }
    try {
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {
      /* IE throws error sometimes */
    }

    return this;
  };

  Pen.prototype.focus = function (focusStart) {
    if (!focusStart) this.setRange();
    this.config.editor.focus();

    return this;
  };

  Pen.prototype.execCommand = function (name, value) {
    name = name.toLowerCase();

    if (name === 'codeblock') {
      this.selection.focusNode.innerHTML = '<code><br></code>';
      commandBlock(this, 'pre');
    } else if (commandsReg.block.test(name)) {
      commandBlock(this, name);
    } else if (commandsReg.inline.test(name)) {
      commandOverall(this, name, value);
    } else if (commandsReg.source.test(name)) {
      this.setRange();
      commandLink(this, name, value);
    } else if (commandsReg.insert.test(name)) {
      this.setRange();
      commandInsert(this, name, value);
    } else if (commandsReg.wrap.test(name)) {
      var selectedNodes = getRangeSelectedNodes(this.selection.getRangeAt(0));
      var selectedParagraphs = 0;

      utils.forEach(selectedNodes, function (item) {
        if (item.nodeName === 'P') {
          selectedParagraphs++;
        }
      });
      if (selectedParagraphs < 2) {
        // TODO: this.selection.focusNode works weird if FF, double click on word selects word/element to the right of target
        var effects = effectNode(this, this.selection.focusNode);
        var codeNode = void 0;

        utils.forEach(effects, function (item) {
          if (item.nodeName === 'CODE') {
            codeNode = item;
          }
        });
        if (codeNode) {
          // FF does not support removeFormat
          if (!commandOverall(this, 'removeFormat')) {
            var unwrappedNodes = doc.createDocumentFragment();

            utils.forEach(codeNode.childNodes, function (item) {
              unwrappedNodes.appendChild(item.cloneNode());
            });
            codeNode.replaceWith(unwrappedNodes);
          }
        } else {
          /**
           * TODO: does not work when selecting the last element
           * for some reasons instead of adding <code>value</code>
           * browsers (FF, Chrome) add <span styles="styles">value</span>
           */
          commandWrap(this, name, value);
        }
      }
    } else {
      utils.log('can not find command function for name: ' + name + (value ? ', value: ' + value : ''), true);
    }
    if (name === 'indent') this.checkContentChange();else this.cleanContent({ cleanAttrs: ['style'] });
  };

  // remove attrs and tags
  // pen.cleanContent({cleanAttrs: ['style'], cleanTags: ['id']})
  Pen.prototype.cleanContent = function (options) {
    var editor = this.config.editor;

    if (!options) options = this.config;
    utils.forEach(options.cleanAttrs, function (attr) {
      utils.forEach(editor.querySelectorAll('[' + attr + ']'), function (item) {
        item.removeAttribute(attr);
      }, true);
    }, true);
    utils.forEach(options.cleanTags, function (tag) {
      utils.forEach(editor.querySelectorAll(tag), function (item) {
        item.parentNode.removeChild(item);
      }, true);
    }, true);

    checkPlaceholder(this);
    this.checkContentChange();

    return this;
  };

  // auto link content, return content
  Pen.prototype.autoLink = function () {
    autoLink(this.config.editor);

    return this.getContent();
  };

  // highlight menu

  // TODO: do not display some actions if selection is inside code block (this is how it works in Slack)
  Pen.prototype.highlight = function () {
    var toolbar = this._toolbar || this._menu;
    var node = getNode(this);
    // remove all highlights

    utils.forEach(toolbar.querySelectorAll('.active'), function (el) {
      el.classList.remove('active');
    }, true);

    if (!node) return this;

    var effects = effectNode(this, node);
    var inputBar = this._inputBar;

    if (inputBar && toolbar === this._menu) {
      // display link input if createlink enabled
      inputBar.style.display = 'none';
      // reset link input value
      inputBar.value = '';
    }

    var highlight = function highlight(str) {
      if (!str) return;
      var el = toolbar.querySelector('[data-action=' + str + ']');

      return el && el.classList.add('active');
    };

    utils.forEach(effects, function (item) {
      var tag = item.nodeName.toLowerCase();

      switch (tag) {
        case 'a':
          if (inputBar) inputBar.value = item.getAttribute('href');
          tag = 'createlink';
          break;
        case 'img':
          if (inputBar) inputBar.value = item.getAttribute('src');
          tag = 'insertimage';
          break;
        case 'i':
          tag = 'italic';
          break;
        case 'u':
          tag = 'underline';
          break;
        case 'b':
          tag = 'bold';
          break;
        case 'pre':
        case 'code':
          tag = 'code';
          break;
        case 'ul':
          tag = 'insertunorderedlist';
          break;
        case 'ol':
          tag = 'insertorderedlist';
          break;
        case 'li':
          tag = 'indent';
          break;
        default:
          break;
      }
      highlight(tag);
    }, true);

    return this;
  };

  // show menu
  Pen.prototype.menu = function () {
    if (!this._menu) return this;
    if (selection.isCollapsed) {
      this._menu.style.display = 'none'; // hide menu
      this._inputActive = false;

      return this;
    }
    if (this._toolbar) {
      if (!this._inputBar || !this._inputActive) return this;
    }
    var offset = this._range.getBoundingClientRect();
    var menuPadding = 10;
    var top = offset.top - menuPadding;
    var left = offset.left + offset.width / 2;
    var menu = this._menu;
    var menuOffset = { x: 0, y: 0 };
    var stylesheet = this._stylesheet;

    // fixes some browser double click visual discontinuity
    // if the offset has no width or height it should not be used
    if (offset.width === 0 && offset.height === 0) return this;

    // store the stylesheet used for positioning the menu horizontally
    if (this._stylesheet === undefined) {
      var style = document.createElement('style');

      document.head.appendChild(style);
      this._stylesheet = stylesheet = style.sheet;
    }
    // display block to caculate its width & height
    menu.style.display = 'block';

    menuOffset.x = left - menu.clientWidth / 2;
    menuOffset.y = top - menu.clientHeight;

    // check to see if menu has over-extended its bounding box. if it has,
    // 1) apply a new class if overflowed on top;
    // 2) apply a new rule if overflowed on the left
    if (stylesheet.cssRules.length > 0) {
      stylesheet.deleteRule(0);
    }
    if (menuOffset.x < 0) {
      menuOffset.x = 0;
      stylesheet.insertRule('.pen-menu:after {left: ' + left + 'px;}', 0);
    } else {
      stylesheet.insertRule('.pen-menu:after {left: 50%; }', 0);
    }
    if (menuOffset.y < 0) {
      menu.classList.add('pen-menu-below');
      menuOffset.y = offset.top + offset.height + menuPadding;
    } else {
      menu.classList.remove('pen-menu-below');
    }

    menu.style.top = menuOffset.y + 'px';
    menu.style.left = menuOffset.x + 'px';

    return this;
  };

  Pen.prototype.stay = function (config) {
    var ctx = this;

    if (!window.onbeforeunload) {
      window.onbeforeunload = function () {
        if (!ctx._isDestroyed) return config.stayMsg;
      };
    }
  };

  Pen.prototype.destroy = function (isAJoke) {
    var destroy = !isAJoke;
    var attr = isAJoke ? 'setAttribute' : 'removeAttribute';

    if (!isAJoke) {
      removeAllListeners(this);
      try {
        selection.removeAllRanges();
        if (this._menu) this._menu.parentNode.removeChild(this._menu);
      } catch (e) {
        /* IE throws error sometimes */
      }
    } else {
      initToolbar(this);
      initEvents(this);
    }
    this._isDestroyed = destroy;
    this.config.editor[attr]('contenteditable', '');

    return this;
  };

  Pen.prototype.rebuild = function () {
    return this.destroy("it's a joke");
  };

  // a fallback for old browers
  root.Pen = function (config) {
    if (!config) return utils.log("can't find config", true);

    var defaults = utils.merge(config);
    var klass = defaults.editor.getAttribute('class');

    klass = klass ? klass.replace(/\bpen\b/g, '') + ' pen-textarea ' + defaults.class : 'pen pen-textarea';
    defaults.editor.setAttribute('class', klass);
    defaults.editor.innerHTML = defaults.textarea;

    return defaults.editor;
  };
  Pen.prototype.toMd = function () {
    var html = this.getContent();
    var turndownService = new TurndownService({
      codeBlockStyle: 'fenced',
      headingStyle: 'atx'
    });

    return turndownService.turndown(html);
  };
  // make it accessible
  if (doc.getSelection) {
    selection = doc.getSelection();
    root.Pen = Pen;
  }
})(window, document);
//# sourceMappingURL=pen.js.map
