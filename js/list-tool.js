/*globals ListOps, ace, jQuery, $, Worker */
/*jslint browser: true */

var ListTool = (function () {
	'use strict';

	var ListTool = {},
		// variables
		$buttonsGet,
		$buttonsTweak,
		defaultSql = null,
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
		selectorLogoMain = '#logo-main',
		selectorLogoResults = '#logo-results',
		showModalKey = 'LIST_TOOL_MODAL_SHOWN',
		worker = null,
		workerKey,
		// functions
		calculating,
		clear,
		doWork,
		getArray,
		getResults,
		handleEditorChange,
		handleListBoxActions,
		setLogo,
		setSql,
		setValueFromArray,
		showAllItemCounts,
		showItemCount,
		tweakResults,
		tweakResultsHelper,
		initEditor;

	calculating = function (isCalculating) {
		if (isCalculating) {
			editorResults.setValue('');
			$('.calculating-done').hide();
			$('.calculating').show();
		} else {
			$('.calculating-done').show();
			$('.calculating').hide();
		}
	};

	clear = function (editor) {
		editor.clearSelection();
		editor.moveCursorTo(0, 0);
	};

	doWork = function (method, one, two, callback) {
		var res = [];

		// force callback to be a function
		if (typeof callback !== 'function') {
			callback = function () {};
		}
		if (method &&
				ListOps.hasOwnProperty(method) &&
				typeof ListOps[method] === 'function') {
			if (typeof Worker !== 'undefined') {
				if (worker !== null) {
					worker.terminate();
				}
				workerKey = (new Date()).getTime();
				worker = new Worker('js/list-worker.js');
				worker.addEventListener('message', function (event) {
					if (event.data.key === workerKey) {
						res = event.data.result || [];
						callback(res);
					}
				}, false);
				worker.postMessage({
					key : workerKey,
					method : method,
					one : one,
					two : two
				});
			} else {
				res = ListOps[method](one, two);
				callback(res);
			}
		} else {
			callback(res);
		}
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
		calculating(true);
		if (aFirst) {
			doWork(method, getArray(editorListA), getArray(editorListB), function (data) {
				results = data;
				tweakResults();
			});
		} else {
			doWork(method, getArray(editorListB), getArray(editorListA), function (data) {
				results = data;
				tweakResults();
			});
		}
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
		if (action === 'select all') {
			editor.selectAll();
		} else if (action === 'trim') {
			editor.setValue($.trim(editor.getValue()));
			clear(editor);
			getResults();
		} else {
			doWork(action, getArray(editor), null, function (data) {
				editor.setValue(data.join('\n'));
				clear(editor);
				getResults();
			});
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

	setSql = function () {
		var $active = $buttonsGet.filter('.active'),
			method = $active.parents('.method-group').data('method'),
			aFirst = $active.hasClass('a-first'),
			isReverse = $('#btn-reverse').is('.active'),
			isSort = $('#btn-sort').is('.active'),
			isUnique = $('#btn-unique').is('.active'),
			listOne,
			listTwo,
			showDefault = false,
			$sql = $('#sql-statement strong'),
			sqlHtml = '';
		// set default
		if (defaultSql === null) {
			defaultSql = $sql.text();
		}
		// set list html
		if (aFirst) {
			listOne = '<span class="blue nobr">[List A]</span>';
			listTwo = '<span class="red nobr">[List B]</span>';
		} else {
			listOne = '<span class="red nobr">[List B]</span>';
			listTwo = '<span class="blue nobr">[List A]</span>';
		}

		// build sql
		sqlHtml = 'SELECT ';

		// is distinct?
		if (isUnique) {
			sqlHtml += 'DISTINCT ';
		}

		// from/join/where
		sqlHtml += '<i>value</i> FROM ';
		if (method === 'self') {
			sqlHtml += listOne;
		} else if (method === 'union') {
			sqlHtml += listOne +
				' FULL OUTER JOIN ' +
				listTwo +
				' ON ' +
				listOne +
				'.<i>value</i> = ' +
				listTwo +
				'.<i>value</i>';
		} else if (method === 'intersection') {
			sqlHtml += listOne +
				' INNER JOIN ' +
				listTwo +
				' ON ' +
				listOne +
				'.<i>value</i> = ' +
				listTwo +
				'.<i>value</i>';
		} else if (method === 'complement') {
			sqlHtml += listOne +
				' LEFT OUTER JOIN ' +
				listTwo +
				' ON ' +
				listOne +
				'.<i>value</i> = ' +
				listTwo +
				'.<i>value</i> ' +
				'WHERE ' +
				listTwo +
				' IS NULL';
		} else if (method === 'outersection') {
			sqlHtml += listOne +
				' FULL OUTER JOIN ' +
				listTwo +
				' ON ' +
				listOne +
				'.<i>value</i> = ' +
				listTwo +
				'.<i>value</i> ' +
				'WHERE ' +
				listOne +
				' IS NULL OR ' +
				listTwo +
				' IS NULL';
		} else {
			sqlHtml = defaultSql;
			showDefault = true;
		}
		if (!showDefault) {
			if (isSort) {
				sqlHtml += ' ORDER BY <i>value</i> ';
				sqlHtml += (isReverse) ? 'DESC' : 'ASC';
			} else if (isReverse) {
				sqlHtml = 'SELECT <i>temp.value</i> FROM (' + sqlHtml + ') AS <i>temp</i> ORDER BY <i>value</i> DESC';
			}
		}
		$sql.html(sqlHtml);
	};

	setValueFromArray = function (editor, arr) {
		editor.setValue(arr.join('\n'));
		clear(editor);
	};

	showAllItemCounts = function () {
		showItemCount(editorListA, '.item-count-list-a');
		showItemCount(editorListB, '.item-count-list-b');
		showItemCount(editorResults, '.item-count-results');
		calculating(false);
	};

	showItemCount = function (editor, selector) {
		$(selector).text(getArray(editor).length);
	};

	tweakResults = function () {
		calculating(true);
		tweakResultsHelper(results.slice(), ['sort', 'unique', 'reverse']);
	};

	tweakResultsHelper = function (arr, fnArray) {
		var current, result;
		if (fnArray.length) {
			current = fnArray.shift();
			if ($('#btn-' + current).is('.active')) {
				doWork(current, arr, null, function (res) {
					result = res;
					tweakResultsHelper(result, fnArray, null, null);
				});
			} else {
				tweakResultsHelper(arr, fnArray, null, null);
			}
		} else {
			setValueFromArray(editorResults, arr);
			showAllItemCounts();
		}
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
			setSql();
		});

		// button clicks: tweak results
		$buttonsTweak.click(function (e) {
			var $current = $(this);
			$current.toggleClass('active');
			if ($current.attr('id') === 'btn-sql') {
				$('body').toggleClass('sql');
			} else {
				tweakResults();
			}
			setSql();
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
