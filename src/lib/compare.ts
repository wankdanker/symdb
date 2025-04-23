export class SymDbComparison {
    static isNull() {
      return new IsNull();
    }
  
    static isUndefined() {
      return new IsUndefined();
    }
  
    static gt(b: any) {
      return new Gt(b);
    }
  
    static gte(b: any) {
      return new Gte(b);
    }
  
    static lt(b: any) {
      return new Lt(b);
    }
  
    static lte(b: any) {
      return new Lte(b);
    }
  
    static startsWith(b: string) {
      return new StartsWith(b);
    }
  
    static contains(b: any) {
      return new Contains(b);
    }
  
    static between(b: any, c: any) {
      return new Between(b, c);
    }
  
    static compare(fn: (a: any) => boolean) {
      return new Compare(fn);
    }
    
    compare(a: any): boolean {
      return false;
    }
  }
  
  class IsNull extends SymDbComparison {
    compare(a: any): boolean {
      return a === null;
    }
  }
  
  class IsUndefined extends SymDbComparison {
    compare(a: any): boolean {
      return a === undefined;
    }
  }
  
  class Gt extends SymDbComparison {
    private b: any;
    
    constructor(b: any) {
      super();
      this.b = b;
    }
  
    compare(a: any): boolean {
      return a > this.b;
    }
  }
  
  class Gte extends SymDbComparison {
    private b: any;
    
    constructor(b: any) {
      super();
      this.b = b;
    }
  
    compare(a: any): boolean {
      return a >= this.b;
    }
  }
  
  class Lt extends SymDbComparison {
    private b: any;
    
    constructor(b: any) {
      super();
      this.b = b;
    }
  
    compare(a: any): boolean {
      return a < this.b;
    }
  }
  
  class Lte extends SymDbComparison {
    private b: any;
    
    constructor(b: any) {
      super();
      this.b = b;
    }
  
    compare(a: any): boolean {
      return a <= this.b;
    }
  }
  
  class StartsWith extends SymDbComparison {
    private b: string;
    
    constructor(b: string) {
      super();
      this.b = b;
    }
  
    compare(a: any): boolean {
      return a && String(a).indexOf(this.b) === 0;
    }
  }
  
  class Contains extends SymDbComparison {
    private b: any;
    
    constructor(b: any) {
      super();
      this.b = b;
    }
  
    compare(a: any): boolean {
      if (Array.isArray(this.b)) {
        return this.b.includes(a);
      }
      return !!~a.indexOf(this.b);
    }
  }
  
  class Between extends SymDbComparison {
    private b: any;
    private c: any;
    
    constructor(b: any, c: any) {
      super();
      this.b = b;
      this.c = c;
    }
  
    compare(a: any): boolean {
      return !!(a > this.b && a < this.c);
    }
  }
  
  class Compare extends SymDbComparison {
    private b: (a: any) => boolean;
    
    constructor(b: (a: any) => boolean) {
      super();
      this.b = b;
    }
  
    compare(a: any): boolean {
      return this.b(a);
    }
  }
  
  export function mixin(target: any): void {
    Object.getOwnPropertyNames(SymDbComparison).forEach(key => {
      if (key === 'prototype' || key === 'length' || key === 'name' || key === 'constructor') {
        return;
      }
      target[key] = SymDbComparison[key];
    });
  }