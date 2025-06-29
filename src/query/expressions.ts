// export class Where {
//   static eq<T>(field: keyof T, value: any): (item: T) => boolean {
//     return (item: T) => item[field] === value;
//   }

//   static neq<T>(field: keyof T, value: any): (item: T) => boolean {
//     return (item: T) => item[field] !== value;
//   }

//   static gt<T>(field: keyof T, value: any): (item: T) => boolean {
//     return (item: T) => (item[field] as any) > value;
//   }

//   static gte<T>(field: keyof T, value: any): (item: T) => boolean {
//     return (item: T) => (item[field] as any) >= value;
//   }

//   static lt<T>(field: keyof T, value: any): (item: T) => boolean {
//     return (item: T) => (item[field] as any) < value;
//   }

//   static lte<T>(field: keyof T, value: any): (item: T) => boolean {
//     return (item: T) => (item[field] as any) <= value;
//   }

//   static contains<T>(field: keyof T, value: string): (item: T) => boolean {
//     return (item: T) => String(item[field]).includes(value);
//   }

//   static startsWith<T>(field: keyof T, value: string): (item: T) => boolean {
//     return (item: T) => String(item[field]).startsWith(value);
//   }

//   static endsWith<T>(field: keyof T, value: string): (item: T) => boolean {
//     return (item: T) => String(item[field]).endsWith(value);
//   }

//   static in<T>(field: keyof T, values: any[]): (item: T) => boolean {
//     return (item: T) => values.includes(item[field]);
//   }

//   static and<T>(...predicates: ((item: T) => boolean)[]): (item: T) => boolean {
//     return (item: T) => predicates.every(p => p(item));
//   }

//   static or<T>(...predicates: ((item: T) => boolean)[]): (item: T) => boolean {
//     return (item: T) => predicates.some(p => p(item));
//   }

//   static not<T>(predicate: (item: T) => boolean): (item: T) => boolean {
//     return (item: T) => !predicate(item);
//   }
// }