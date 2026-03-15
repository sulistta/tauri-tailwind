declare module '@erikwithuhk/html-to-jsx' {
    interface HtmlToJsxOptions {
        createClass?: boolean
        indent?: string
        outputClassName?: string
    }

    interface HtmlToJsxConvertOptions {
        containerTag?: string
    }

    export default class HTMLtoJSX {
        constructor(options?: HtmlToJsxOptions)

        convert(html: string, options?: HtmlToJsxConvertOptions): string
    }
}
