export function Promised(context: any, method: Function, ...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const callback = function(...callbackArgs: any[]) {
        const err = callbackArgs.shift();
        if (err) {
          return reject(err);
        }
        if (callbackArgs.length === 1) {
          return resolve(callbackArgs[0]);
        }
        return resolve(callbackArgs);
      };
      
      args.push(callback);
      return method.apply(context, args);
    });
  }