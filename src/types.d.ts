// src/types.d.ts

export type PositiveInteger = number & { readonly __positiveInteger__: unique symbol };

export function isPositiveInteger(value: number): value is PositiveInteger {
    return Number.isInteger(value) && value > 0;
}

export function asPositiveInteger(value: number): PositiveInteger {
    if (!isPositiveInteger(value)) {
        throw new Error("Value must be a positive integer");
    }
    return value as PositiveInteger;
}
