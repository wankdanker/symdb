export function sort(records: any[], sortOptions: { [key: string]: string }): any[] {
    const keys = Object.keys(sortOptions).reverse();
  
    keys.forEach((key) => {
      const dir = sortOptions[key] || 'asc';
  
      records.sort((a, b) => {
        const val1 = dir === 'desc' ? b[key] : a[key];
        const val2 = dir === 'desc' ? a[key] : b[key];
  
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
  
    return records;
  }