/*globals ListOps, ace, jQuery, $ */
/*jslint browser: true */

var ListTool = (function () {
	'use strict';

	var ListTool = {},
		// variables
		$buttonsGet,
		$buttonsTweak,
		editorChangeThrottleTime = 100,
		editorChangeTimer,
		editorListA,
		editorListB,
		editorResults,
		gettingExampleDataset = false,
		heightLogoMain = 81,
		heightLogoResults = 32,
		isInited = false,
		results = [],
		resultsToShow = [],
		selectorLogoMain = '#logo-main',
		selectorLogoResults = '#logo-results',
		showModalKey = 'LIST_TOOL_MODAL_SHOWN',
		// functions
		clear,
		getArray,
		getResults,
		handleEditorChange,
		handleListBoxActions,
		setLogo,
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
		if (method && ListOps.hasOwnProperty(method) && typeof ListOps[method] === 'function') {
			if (aFirst) {
				results = ListOps[method](getArray(editorListA), getArray(editorListB));
			} else {
				results = ListOps[method](getArray(editorListB), getArray(editorListA));
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
			editor.setValue(ListOps.unique(getArray(editor)).join('\n'));
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

	setLogo = function (selector, logoHeight, index) {
		var logoIndex = 0,
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
		$(selector).css('background-position', backgroundPosition);
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
			resultsToShow = ListOps.unique(resultsToShow);
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

	ListTool.clearModalShown = function () {
		if (window.localStorage) {
			window.localStorage[showModalKey] = true;
		}
	};

	ListTool.getEditors = function () {
		return [editorListA, editorListB, editorResults];
	};

	/* can pass in null for listA or listB to skip populating that list */
	ListTool.populateLists = function (listA, listB) {
		if ($.isArray(listA)) {
			setValueFromArray(editorListA, listA);
		}
		if ($.isArray(listB)) {
			setValueFromArray(editorListB, listB);
		}
	};

	ListTool.init = function () {
		var showModal = true;

		// only init once
		if (isInited) {
			return;
		}

		// store buttons
		$buttonsGet = $('#get-results button');
		$buttonsTweak = $('#tweak-results button');

		// init editors
		editorListA = initEditor('list-a', true);
		editorListB = initEditor('list-b', true);
		editorResults = initEditor('results', false);
		editorResults.setReadOnly(true);

		// button clicks: get results
		$buttonsGet.click(function (e) {
			var $current = $(this), isActive = $current.hasClass('active');
			$buttonsGet.removeClass('active');
			if (!isActive) {
				$current.addClass('active');
			}
			setLogo(selectorLogoMain, heightLogoMain);
			setLogo(selectorLogoResults, heightLogoResults);
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
			setLogo(selectorLogoMain, heightLogoMain, $(this).data('logo'));
		}, function (e) {
			setLogo(selectorLogoMain, heightLogoMain);
		});

		// handle things like: sort, select all, etc
		$('.list-box-actions .badge').click(handleListBoxActions);

		// handle example datasets button clicks
		$('#example-datasets button').click(function () {
			if (!gettingExampleDataset) {
				gettingExampleDataset = true;
				$.ajax({
					dataType : 'json',
					url : $(this).data('href'),
					success : function (data) {
						if ($.isArray(data) && data.length === 2) {
							ListTool.populateLists(data[0], data[1]);
						}
					},
					complete : function () {
						gettingExampleDataset = false;
						$('.modal-footer .btn').click();
					}
				});
			}
		});

		// make sure to calculate results / show item counts
		getResults();

		// pop open "information modal" on first page visit
		if (window.localStorage) {
			if (window.localStorage[showModalKey] === 'shown') {
				showModal = false;
			} else {
				window.localStorage[showModalKey] = 'shown';
			}
		}
		if (showModal) {
			$('#header-actions .btn-info').click();
		}

		// never init again
		isInited = true;
	};

	return ListTool;
}());

// initial ListTool when the DOM is ready.
$(document).ready(ListTool.init);
