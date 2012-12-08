/*globals jQuery, $, ace, document, clearTimeout, setTimeout */

var ListTool = (function () {
	'use strict';

	var api = {},
		// variables
		$buttonsGet,
		$buttonsTweak,
		editorChangeThrottleTime = 100,
		editorChangeTimer,
		editorListA,
		editorListB,
		editorResults,
		results = [],
		resultsToShow = [],
		// functions
		clear,
		getArray,
		getResults,
		handleEditorChange,
		handleListBoxActions,
		setMainLogo,
		setValueFromArray,
		showAllItemCounts,
		showItemCount,
		tweakResults,
		initEditor;

	clear = function (editor) {
		editor.clearSelection();
		editor.moveCursorTo(0, 0);
	};

	getArray = function (editor) {
		var numLines = editor.session.getLength(),
			result = editor.session.getLines(0, numLines);
		if (result.length && result[result.length - 1] === '') {
			result.pop();
		}
		return result;
	};

	getResults = function () {
		var $active = $buttonsGet.filter('.active'),
			method = $active.parents('.method-group').data('method'),
			aFirst = $active.hasClass('a-first');
		if (method && api.hasOwnProperty(method) && typeof api[method] === 'function') {
			if (aFirst) {
				results = api[method](getArray(editorListA), getArray(editorListB));
			} else {
				results = api[method](getArray(editorListB), getArray(editorListA));
			}
		} else {
			results = [];
		}
		tweakResults();
	};

	handleEditorChange = function (e) {
		clearTimeout(editorChangeTimer);
		editorChangeTimer = setTimeout(getResults, editorChangeThrottleTime);
	};

	handleListBoxActions = function (e) {
		var $badge = $(this),
			$container = $badge.parents('#list-boxes div.span4'),
			$listBox = $container.find('.list-box'),
			id = $listBox.attr('id'),
			action = $badge.text(),
			refreshResults = true,
			editor;

		// get editor
		if (id === 'list-a') {
			editor = editorListA;
		} else if (id === 'list-b') {
			editor = editorListB;
		} else if (id === 'results') {
			editor = editorResults;
		} else {
			return;
		}

		// perform action
		if (action === 'trim') {
			editor.setValue($.trim(editor.getValue()));
		} else if (action === 'sort') {
			editor.setValue(getArray(editor).sort().join('\n'));
		} else if (action === 'reverse') {
			editor.setValue(getArray(editor).reverse().join('\n'));
		} else if (action === 'unique') {
			editor.setValue(api.unique(getArray(editor)).join('\n'));
		} else if (action === 'select all') {
			editor.selectAll();
			refreshResults = false;
		}

		// refresh results if we didn't "select all"
		if (refreshResults) {
			clear(editor);
			getResults();
		}

		// make sure editor is now focused
		editor.focus();
	};

	setMainLogo = function (index) {
		var logoHeight = 81,
			logoIndex = 0,
			activeIndex = parseInt($buttonsGet.filter('.active').data('logo'), 10),
			backgroundPosition = '0 0';
		if (typeof index === 'number') {
			logoIndex = index;
		} else if (typeof activeIndex === 'number') {
			logoIndex = activeIndex;
		}
		if (logoIndex > 0) {
			backgroundPosition = '0 -' + (logoIndex * logoHeight) + 'px';
		}
		$('#main-logo').css('background-position', backgroundPosition);
	};

	setValueFromArray = function (editor, arr) {
		editor.setValue(arr.join('\n'));
		clear(editor);
	};

	showAllItemCounts = function () {
		showItemCount(editorListA, '.item-count-list-a');
		showItemCount(editorListB, '.item-count-list-b');
		showItemCount(editorResults, '.item-count-results');
	};

	showItemCount = function (editor, selector) {
		$(selector).text(getArray(editor).length);
	};

	tweakResults = function () {
		resultsToShow = results.slice();

		if ($('#btn-sort').is('.active')) {
			resultsToShow.sort();
		}

		if ($('#btn-reverse').is('.active')) {
			resultsToShow.reverse();
		}

		if ($('#btn-unique').is('.active')) {
			resultsToShow = api.unique(resultsToShow);
		}

		setValueFromArray(editorResults, resultsToShow);
		showAllItemCounts();
	};

	initEditor = function (id, listenForChanges) {
		var editor = ace.edit(id);
		editor.setTheme('ace/theme/eclipse');
		editor.getSession().setMode('ace/mode/text');
		editor.setShowPrintMargin(false);
		if (listenForChanges) {
			editor.on('change', handleEditorChange);
		}
		return editor;
	};

	api.self = function (arr) {
		return arr;
	};

	api.unique = function (arr) {
		var ret = [];
		arr.forEach(function (value) {
			if (ret.indexOf(value) < 0) {
				ret.push(value);
			}
		});
		return ret;
	};

	api.union = function (one, two) {
		return one.concat(two);
	};

	api.intersection = function (one, two) {
		var ret = [];
		one.forEach(function (value) {
			if (two.indexOf(value) >= 0) {
				ret.push(value);
			}
		});
		return ret;
	};

	api.complement = function (one, two) {
		var ret = [];
		one.forEach(function (value) {
			if (two.indexOf(value) < 0) {
				ret.push(value);
			}
		});
		return ret;
	};

	api.outersection = function (one, two) {
		var setOne = [], setTwo = [];
		setOne = api.complement(one, two);
		setTwo = api.complement(two, one);
		return api.union(setOne, setTwo);
	};

	api.getEditors = function () {
		return [editorListA, editorListB, editorResults];
	};

	api.init = function (one, two) {
		$(document).ready(function () {
			// store buttons
			$buttonsGet = $('#get-results button');
			$buttonsTweak = $('#tweak-results button');

			// init editors
			editorListA = initEditor('list-a', true);
			editorListB = initEditor('list-b', true);
			editorResults = initEditor('results', false);
			editorResults.setReadOnly(true);

			// setup start values
			setValueFromArray(editorListA, one);
			setValueFromArray(editorListB, two);

			// button clicks: get results
			$buttonsGet.click(function (e) {
				var $current = $(this), isActive = $current.hasClass('active');
				$buttonsGet.removeClass('active');
				if (!isActive) {
					$current.addClass('active');
				}
				setMainLogo();
				getResults();
			});

			// button clicks: tweak results
			$buttonsTweak.click(function (e) {
				$(this).toggleClass('active');
				tweakResults();
			});

			// apply tooltips
			$buttonsGet.each(function (index) {
				var options = {};
				options.delay = { show : 500 };
				options.placement = index % 2 === 1 ? 'bottom' : 'top';
				$(this).tooltip(options);
			});

			// change main-icon when hovering
			$buttonsGet.hover(function (e) {
				setMainLogo($(this).data('logo'));
			}, function (e) {
				setMainLogo();
			});

			// handle things like: sort, select all, etc
			$('.list-box-actions .badge').click(handleListBoxActions);

			// make sure to calculate results / show item counts
			getResults();
		});

	};

	return api;
}());

ListTool.init(
	['value-4', 'value-3', 'value-7', 'value-6', 'value-4'],
	['value-1', 'value-7', 'value-3', 'value-1', 'value-1', 'value-1']
);
