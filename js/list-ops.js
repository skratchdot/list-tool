var ListOps = (function () {
	'use strict';

	var ListOps = {};

	ListOps.self = function (arr) {
		return arr;
	};

	ListOps.unique = function (arr) {
		var ret = [];
		arr.forEach(function (value) {
			if (ret.indexOf(value) < 0) {
				ret.push(value);
			}
		});
		return ret;
	};

	ListOps.union = function (one, two) {
		return one.concat(two);
	};

	ListOps.intersection = function (one, two) {
		var ret = [];
		one.forEach(function (value) {
			if (two.indexOf(value) >= 0) {
				ret.push(value);
			}
		});
		return ret;
	};

	ListOps.complement = function (one, two) {
		var ret = [];
		one.forEach(function (value) {
			if (two.indexOf(value) < 0) {
				ret.push(value);
			}
		});
		return ret;
	};

	ListOps.outersection = function (one, two) {
		var setOne = [], setTwo = [];
		setOne = ListOps.complement(one, two);
		setTwo = ListOps.complement(two, one);
		return ListOps.union(setOne, setTwo);
	};

	return ListOps;
}());