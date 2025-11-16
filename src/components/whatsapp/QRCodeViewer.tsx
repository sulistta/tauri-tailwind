interface QRCodeViewerProps {
    qrCode: string | null
}

export default function QRCodeViewer({ qrCode }: QRCodeViewerProps) {
    if (!qrCode) {
        return (
            <div className="flex h-64 w-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                <p className="text-sm text-gray-500">Aguardando QR Code...</p>
            </div>
        )
    }

    return (
        <div className="rounded-lg border-2 border-gray-200 bg-white p-4 shadow-sm">
            <img src={qrCode} alt="WhatsApp QR Code" className="h-64 w-64" />
            <p className="mt-2 text-center text-sm text-gray-600">
                Escaneie o código QR com o WhatsApp
            </p>
        </div>
    )
}
