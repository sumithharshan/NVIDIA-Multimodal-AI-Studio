declare module '*.css';
declare module '*.scss';
declare module '*.module.css';
declare module '*.module.scss';

interface CSSModuleClasses {
  readonly [key: string]: string;
}

declare const styles: CSSModuleClasses;
export default styles;
