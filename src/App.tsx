import React, { useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

import './app/global.css'

type ProcessProfile = {
    name: string
    description: string
}

type SimulationStatus = {
    active: boolean
    pid: number | null
    target_name: string | null
    executable_path: string | null
}

const LOCAL_PROFILES: ProcessProfile[] = [
    {
        name: 'processo_teste',
        description:
            'Perfil genérico para validar coleta e auditoria de processos.'
    },
    {
        name: 'telemetry_agent',
        description:
            'Simula um agente local de telemetria com footprint mínimo.'
    },
    {
        name: 'audit_worker',
        description:
            'Processo ocioso para testes de inventário e monitoramento.'
    },
    {
        name: 'backup_probe',
        description: 'Nome candidato para simular serviços auxiliares locais.'
    }
]

const INACTIVE_STATUS: SimulationStatus = {
    active: false,
    pid: null,
    target_name: null,
    executable_path: null
}

function App() {
    const [profiles, setProfiles] = useState<ProcessProfile[]>(LOCAL_PROFILES)
    const [selectedName, setSelectedName] = useState(LOCAL_PROFILES[0].name)
    const [status, setStatus] = useState<SimulationStatus>(INACTIVE_STATUS)
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState(
        'Selecione um perfil e inicie uma simulação local.'
    )
    const [error, setError] = useState<string | null>(null)

    const selectedProfile = useMemo(
        () =>
            profiles.find((profile) => profile.name === selectedName) ??
            profiles[0],
        [profiles, selectedName]
    )

    useEffect(() => {
        let isMounted = true

        async function loadProfiles() {
            try {
                const remoteProfiles =
                    await invoke<ProcessProfile[]>('fetch_profile_list')
                if (isMounted && remoteProfiles.length > 0) {
                    setProfiles(remoteProfiles)
                    setSelectedName(remoteProfiles[0].name)
                    setMessage('Perfis carregados. Pronto para simular.')
                }
            } catch (loadError) {
                if (isMounted) {
                    setError(formatError(loadError))
                    setMessage(
                        'Usando perfis locais porque a lista remota não foi carregada.'
                    )
                }
            }
        }

        void loadProfiles()

        return () => {
            isMounted = false
        }
    }, [])

    async function startSimulation() {
        setIsLoading(true)
        setError(null)

        try {
            const nextStatus = await invoke<SimulationStatus>(
                'start_simulation',
                {
                    targetName: selectedName
                }
            )
            setStatus(nextStatus)
            setMessage(
                `Simulação ativa para ${nextStatus.target_name ?? selectedName}.`
            )
        } catch (startError) {
            setError(formatError(startError))
        } finally {
            setIsLoading(false)
        }
    }

    async function stopSimulation() {
        setIsLoading(true)
        setError(null)

        try {
            const nextStatus = await invoke<SimulationStatus>('stop_simulation')
            setStatus(nextStatus)
            setMessage('Simulação encerrada e diretório temporário limpo.')
        } catch (stopError) {
            setError(formatError(stopError))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-8">
                <header className="flex flex-col gap-3 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.35em] text-blue-300">
                            Local Security Audit Lab
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
                            Simulador de Processos Linux
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                            Crie um subprocesso renomeado que entra em idle
                            daemon com thread estacionada, sem webview e com
                            consumo estável próximo de 0% de CPU.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 shadow-2xl shadow-blue-950/30">
                        <span className="text-xs uppercase tracking-[0.25em] text-slate-500">
                            Status
                        </span>
                        <div className="mt-2 flex items-center gap-3">
                            <span
                                className={`h-3 w-3 rounded-full ${
                                    status.active
                                        ? 'bg-emerald-400 shadow-emerald-400/50'
                                        : 'bg-slate-600'
                                } shadow-lg`}
                            />
                            <strong
                                className={
                                    status.active
                                        ? 'text-emerald-300'
                                        : 'text-slate-300'
                                }
                            >
                                {status.active ? 'Ativo' : 'Inativo'}
                            </strong>
                        </div>
                    </div>
                </header>

                <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
                    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/30">
                        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold">
                                    Perfis candidatos
                                </h2>
                                <p className="text-sm text-slate-400">
                                    Selecione o nome de arquivo que será usado
                                    pela cópia temporária do binário.
                                </p>
                            </div>
                            <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-200">
                                {profiles.length} perfis
                            </span>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            {profiles.map((profile) => {
                                const isSelected = profile.name === selectedName

                                return (
                                    <button
                                        className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300/60 hover:bg-blue-500/10 ${
                                            isSelected
                                                ? 'border-blue-300/70 bg-blue-500/15 shadow-lg shadow-blue-950/50'
                                                : 'border-white/10 bg-white/[0.03]'
                                        }`}
                                        disabled={isLoading || status.active}
                                        key={profile.name}
                                        onClick={() =>
                                            setSelectedName(profile.name)
                                        }
                                        type="button"
                                    >
                                        <div className="font-mono text-sm font-semibold text-blue-100">
                                            {profile.name}
                                        </div>
                                        <p className="mt-2 text-sm leading-5 text-slate-400">
                                            {profile.description}
                                        </p>
                                    </button>
                                )
                            })}
                        </div>

                        <label
                            className="mt-5 block text-sm font-medium text-slate-300"
                            htmlFor="target-name"
                        >
                            Nome customizado do processo
                        </label>
                        <input
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                            disabled={isLoading || status.active}
                            id="target-name"
                            onChange={(event) =>
                                setSelectedName(event.target.value)
                            }
                            placeholder="processo_teste"
                            spellCheck={false}
                            value={selectedName}
                        />
                        <p className="mt-2 text-xs text-slate-500">
                            Permitido no backend: letras, números, ponto, hífen
                            e underscore.
                        </p>
                    </div>

                    <aside className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/30">
                        <h2 className="text-xl font-semibold">
                            Controle da simulação
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            O backend copia o executável atual para
                            /tmp/process_simulator, renomeia o arquivo e executa
                            a cópia com a flag --idle-daemon.
                        </p>

                        <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                            <InfoRow
                                label="Perfil"
                                value={selectedProfile?.name ?? selectedName}
                            />
                            <InfoRow
                                label="PID"
                                value={status.pid?.toString() ?? '—'}
                            />
                            <InfoRow
                                label="Binário"
                                value={status.executable_path ?? '—'}
                                mono
                            />
                        </div>

                        <div className="mt-6 grid gap-3">
                            <button
                                className="rounded-2xl bg-blue-500 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-950/50 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
                                disabled={
                                    isLoading ||
                                    status.active ||
                                    selectedName.trim().length === 0
                                }
                                onClick={startSimulation}
                                type="button"
                            >
                                {isLoading && !status.active
                                    ? 'Iniciando...'
                                    : 'Iniciar Simulação'}
                            </button>
                            <button
                                className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-3 font-semibold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-slate-500"
                                disabled={isLoading || !status.active}
                                onClick={stopSimulation}
                                type="button"
                            >
                                {isLoading && status.active
                                    ? 'Parando...'
                                    : 'Parar'}
                            </button>
                        </div>

                        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                            {message}
                        </div>

                        {error ? (
                            <div className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
                                {error}
                            </div>
                        ) : null}
                    </aside>
                </section>
            </div>
        </main>
    )
}

function InfoRow({
    label,
    mono = false,
    value
}: {
    label: string
    mono?: boolean
    value: React.ReactNode
}) {
    return (
        <div className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.25em] text-slate-500">
                {label}
            </span>
            <span
                className={`${mono ? 'font-mono text-xs' : 'text-sm'} break-words text-slate-200`}
            >
                {value}
            </span>
        </div>
    )
}

function formatError(error: unknown) {
    return error instanceof Error ? error.message : String(error)
}

export default App
