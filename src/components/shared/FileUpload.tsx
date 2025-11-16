import { useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { Button } from '@/components/ui/button'
import { Upload, FileText, X } from 'lucide-react'

interface FileUploadProps {
    onUpload: (phoneNumbers: string[]) => void
    disabled?: boolean
}

export default function FileUpload({
    onUpload,
    disabled = false
}: FileUploadProps) {
    const [fileName, setFileName] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const parsePhoneNumbers = (
        content: string,
        fileExtension: string
    ): string[] => {
        let numbers: string[] = []

        if (fileExtension === 'csv') {
            // Parse CSV - assume phone numbers are in the first column
            const lines = content.split('\n').filter((line) => line.trim())

            // Skip header if it exists (check if first line contains non-numeric characters)
            const startIndex = /^[a-zA-Z]/.test(lines[0]) ? 1 : 0

            numbers = lines.slice(startIndex).map((line) => {
                const columns = line.split(',')
                return columns[0].trim().replace(/['"]/g, '')
            })
        } else {
            // Parse TXT - one phone number per line
            numbers = content
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
        }

        // Clean phone numbers - remove non-numeric characters except +
        numbers = numbers.map((num) => num.replace(/[^\d+]/g, ''))

        // Filter out empty strings and validate basic format
        numbers = numbers.filter((num) => num.length >= 10)

        return numbers
    }

    const handleFileSelect = async () => {
        try {
            setError(null)

            const selected = await open({
                multiple: false,
                filters: [
                    {
                        name: 'Text Files',
                        extensions: ['txt', 'csv']
                    }
                ]
            })

            if (!selected) return

            const filePath = selected as string
            const fileNameParts = filePath.split(/[/\\]/)
            const name = fileNameParts[fileNameParts.length - 1]
            const extension = name.split('.').pop()?.toLowerCase() || ''

            if (!['txt', 'csv'].includes(extension)) {
                setError('Formato de arquivo não suportado. Use TXT ou CSV.')
                return
            }

            const content = await readTextFile(filePath)
            const phoneNumbers = parsePhoneNumbers(content, extension)

            if (phoneNumbers.length === 0) {
                setError(
                    'Nenhum número de telefone válido encontrado no arquivo.'
                )
                return
            }

            setFileName(name)
            onUpload(phoneNumbers)
        } catch (err) {
            console.error('Failed to read file:', err)
            setError('Erro ao ler o arquivo. Tente novamente.')
        }
    }

    const handleClear = () => {
        setFileName(null)
        setError(null)
        onUpload([])
    }

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
                Arquivo com Números
            </label>

            {!fileName ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 transition-all hover:border-blue-400 hover:bg-blue-50/50 hover:scale-[1.01]">
                    <Upload className="h-12 w-12 text-gray-400 mb-4 transition-transform hover:scale-110" />
                    <p className="text-sm text-gray-600 mb-2">
                        Clique para selecionar um arquivo TXT ou CSV
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                        Um número por linha (TXT) ou primeira coluna (CSV)
                    </p>
                    <Button
                        onClick={handleFileSelect}
                        disabled={disabled}
                        variant="outline"
                        className="transition-all hover:scale-105"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Selecionar Arquivo
                    </Button>
                </div>
            ) : (
                <div className="flex items-center justify-between rounded-lg border border-gray-300 bg-gray-50 p-4 transition-all hover:shadow-md animate-fade-in">
                    <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-600 animate-scale-in" />
                        <div>
                            <p className="text-sm font-medium text-gray-900">
                                {fileName}
                            </p>
                            <p className="text-xs text-gray-500">
                                Arquivo carregado
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={handleClear}
                        disabled={disabled}
                        variant="ghost"
                        size="sm"
                        className="transition-all hover:scale-110 hover:bg-red-50"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 animate-fade-in">
                    {error}
                </div>
            )}
        </div>
    )
}
