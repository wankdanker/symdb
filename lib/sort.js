module.exports = sort;

function sort (records, sort) {
	var keys = Object.keys(sort).reverse();
	
	keys.forEach(function (key, ix) {
		var dir = sort[key] || 'asc';
		
		records.sort(function (a, b) {
			var val1 = (dir == 'desc') ? b[key] : a[key];
			var val2 = (dir == 'desc') ? a[key] : b[key];
			
			if (val1 == null && val2 != null) {
				return -1;
			}
			
			if (val1 != null && val2 == null) {
				return 1;
			}
			
			if (val1 == null && val2 == null) {
				return 0;
			}
			
			if (val1 < val2) {
				return -1;
			}
			
			if (val1 > val2) {
				return 1;
			}
			
			return 0;
		});
	});
	
	return records
};
