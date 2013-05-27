/*globals importScripts, ListOps */

importScripts('/list-tool/js/list-ops.js');

(function (global) {
	'use strict';

	/**
	 * Listen for events that pass in:
	 *     key    - a pass-through string to do synchronization (if needed)
	 *     method - the name of the ListOps method to call
	 *     one    - the first parameter to the ListOps method
	 *     two    - the second parameter to the ListOps method
	 */
	global.onmessage = function (event) {
		var result = [],
			obj = {};
		obj.method = event.data.method || 'empty';
		obj.one = event.data.one || [];
		obj.two = event.data.two || [];
		obj.key = event.data.key || '';
		result = ListOps[obj.method](obj.one, obj.two);
		global.postMessage({
			result : result,
			key : obj.key
		});
	};

}(this));