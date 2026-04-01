// @ts-expect-error Variable replacement from DefinePlugin
export const naaClientId = function (): string { return __NAACLIENTID__; };
