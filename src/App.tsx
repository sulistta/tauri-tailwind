import React, { useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

import './app/global.css'

type GameExecutable = {
    arguments?: string
    is_launcher?: boolean
    name: string
    os: string
}

type GameListItem = {
    aliases?: string[]
    executables?: GameExecutable[]
    hook?: boolean
    id: string
    name: string
    overlay?: boolean
    themes?: string[]
}

type ProcessProfile = {
    aliases: string[]
    description: string
    executableName: string
    gameName: string
    hook: boolean
    id: string
    overlay: boolean
    processName: string
    themes: string[]
}

type SimulationStatus = {
    active: boolean
    pid: number | null
    target_name: string | null
    executable_path: string | null
}

const FALLBACK_PROFILES: ProcessProfile[] = [
    {
        aliases: [],
        description: 'Perfil local de fallback para validação da simulação.',
        executableName: 'processo_teste',
        gameName: 'Processo de Teste',
        hook: false,
        id: 'fallback-processo-teste',
        overlay: false,
        processName: 'processo_teste',
        themes: ['Auditoria']
    }
]

const INACTIVE_STATUS: SimulationStatus = {
    active: false,
    pid: null,
    target_name: null,
    executable_path: null
}

const VISIBLE_PROFILE_LIMIT = 80

function App() {
    const [profiles, setProfiles] =
        useState<ProcessProfile[]>(FALLBACK_PROFILES)
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
        FALLBACK_PROFILES[0].id
    )
    const [selectedName, setSelectedName] = useState(
        FALLBACK_PROFILES[0].processName
    )
    const [status, setStatus] = useState<SimulationStatus>(INACTIVE_STATUS)
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('Carregando public/gamelist.json...')
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const selectedProfile = useMemo(
        () =>
            profiles.find((profile) => profile.id === selectedProfileId) ??
            null,
        [profiles, selectedProfileId]
    )

    const filteredProfiles = useMemo(() => {
        const query = search.trim().toLowerCase()

        if (!query) {
            return profiles
        }

        return profiles.filter((profile) =>
            [
                profile.gameName,
                profile.processName,
                profile.executableName,
                ...profile.aliases,
                ...profile.themes
            ]
                .join(' ')
                .toLowerCase()
                .includes(query)
        )
    }, [profiles, search])

    const visibleProfiles = filteredProfiles.slice(0, VISIBLE_PROFILE_LIMIT)

    useEffect(() => {
        let isMounted = true

        async function loadGameList() {
            try {
                const response = await fetch('/gamelist.json')

                if (!response.ok) {
                    throw new Error(
                        `falha ao carregar /gamelist.json: HTTP ${response.status}`
                    )
                }

                const games = (await response.json()) as GameListItem[]
                const nextProfiles = mapGameListToProfiles(games)

                if (nextProfiles.length === 0) {
                    throw new Error(
                        'public/gamelist.json não contém executáveis válidos'
                    )
                }

                if (isMounted) {
                    setProfiles(nextProfiles)
                    setSelectedProfileId(nextProfiles[0].id)
                    setSelectedName(nextProfiles[0].processName)
                    setMessage(
                        `${nextProfiles.length} perfis carregados de public/gamelist.json.`
                    )
                }
            } catch (loadError) {
                if (isMounted) {
                    setError(formatError(loadError))
                    setMessage(
                        'Usando perfil de fallback porque public/gamelist.json não foi carregado.'
                    )
                }
            }
        }

        void loadGameList()

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

    function selectProfile(profile: ProcessProfile) {
        setSelectedProfileId(profile.id)
        setSelectedName(profile.processName)
    }

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-8">
                <header className="flex flex-col gap-3 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.35em] text-blue-300">
                            Local Security Audit Lab
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
                            Simulador de Processos por GameList
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                            Os candidatos agora vêm diretamente de{' '}
                            <strong>public/gamelist.json</strong>. O app extrai
                            o executável principal de cada jogo e usa esse nome
                            para criar o processo idle.
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

                <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/30">
                        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold">
                                    Jogos em public/gamelist.json
                                </h2>
                                <p className="text-sm text-slate-400">
                                    Selecione um jogo para usar o nome do
                                    executável como processo simulado.
                                </p>
                            </div>
                            <div className="min-w-64">
                                <label
                                    className="text-xs uppercase tracking-[0.25em] text-slate-500"
                                    htmlFor="search"
                                >
                                    Buscar
                                </label>
                                <input
                                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/10"
                                    disabled={isLoading || status.active}
                                    id="search"
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Nome, executável ou tema"
                                    value={search}
                                />
                            </div>
                        </div>

                        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-blue-200">
                                {profiles.length} perfis carregados
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                                exibindo {visibleProfiles.length} de{' '}
                                {filteredProfiles.length}
                            </span>
                        </div>

                        <div className="grid max-h-[38rem] gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
                            {visibleProfiles.map((profile) => {
                                const isSelected =
                                    profile.id === selectedProfileId

                                return (
                                    <button
                                        className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300/60 hover:bg-blue-500/10 ${
                                            isSelected
                                                ? 'border-blue-300/70 bg-blue-500/15 shadow-lg shadow-blue-950/50'
                                                : 'border-white/10 bg-white/[0.03]'
                                        }`}
                                        disabled={isLoading || status.active}
                                        key={profile.id}
                                        onClick={() => selectProfile(profile)}
                                        type="button"
                                    >
                                        <div className="line-clamp-1 text-sm font-semibold text-slate-100">
                                            {profile.gameName}
                                        </div>
                                        <div className="mt-2 break-all font-mono text-xs font-semibold text-blue-100">
                                            {profile.processName}
                                        </div>
                                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                                            {profile.description}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {profile.themes
                                                .slice(0, 3)
                                                .map((theme) => (
                                                    <span
                                                        className="rounded-full bg-slate-800 px-2 py-0.5 text-[0.65rem] text-slate-300"
                                                        key={`${profile.id}-${theme}`}
                                                    >
                                                        {theme}
                                                    </span>
                                                ))}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
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
                                label="Jogo"
                                value={
                                    selectedProfile?.gameName ?? 'Customizado'
                                }
                            />
                            <InfoRow
                                label="Executável original"
                                value={selectedProfile?.executableName ?? '—'}
                                mono
                            />
                            <InfoRow
                                label="PID"
                                value={status.pid?.toString() ?? '—'}
                            />
                            <InfoRow
                                label="Binário temporário"
                                value={status.executable_path ?? '—'}
                                mono
                            />
                        </div>

                        <label
                            className="mt-5 block text-sm font-medium text-slate-300"
                            htmlFor="target-name"
                        >
                            Nome do processo a simular
                        </label>
                        <input
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                            disabled={isLoading || status.active}
                            id="target-name"
                            onChange={(event) => {
                                setSelectedProfileId(null)
                                setSelectedName(event.target.value)
                            }}
                            placeholder="game.exe"
                            spellCheck={false}
                            value={selectedName}
                        />
                        <p className="mt-2 text-xs text-slate-500">
                            Nomes vindos do gamelist são normalizados para
                            letras, números, ponto, hífen e underscore.
                        </p>

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

function mapGameListToProfiles(games: GameListItem[]) {
    return games.flatMap((game, index) => {
        const executable = pickExecutable(game.executables)

        if (!executable) {
            return []
        }

        const processName = toSafeProcessName(executable.name, game.id)
        const themes = game.themes ?? []
        const aliases = game.aliases ?? []

        return [
            {
                aliases,
                description: buildDescription(game, executable, themes),
                executableName: executable.name,
                gameName: game.name,
                hook: Boolean(game.hook),
                id: `${game.id}-${index}`,
                overlay: Boolean(game.overlay),
                processName,
                themes
            }
        ]
    })
}

function pickExecutable(executables: GameExecutable[] | undefined) {
    if (!executables || executables.length === 0) {
        return null
    }

    return (
        executables.find(
            (executable) => executable.os === 'win32' && !executable.is_launcher
        ) ??
        executables.find((executable) => !executable.is_launcher) ??
        executables[0]
    )
}

function buildDescription(
    game: GameListItem,
    executable: GameExecutable,
    themes: string[]
) {
    const flags = [game.hook ? 'hook' : null, game.overlay ? 'overlay' : null]
        .filter(Boolean)
        .join(' / ')
    const themeText =
        themes.length > 0
            ? themes.slice(0, 4).join(', ')
            : 'sem temas cadastrados'
    const flagText = flags ? ` Recursos: ${flags}.` : ''

    return `Executável base: ${executable.name}. Temas: ${themeText}.${flagText}`
}

function toSafeProcessName(rawName: string, gameId: string) {
    const basename =
        rawName.replace(/^>+/, '').split(/[\\/]/).pop()?.trim() ?? ''
    const asciiOnly = Array.from(basename.normalize('NFKD'))
        .filter((char) => char.charCodeAt(0) <= 127)
        .join('')
    const normalized = asciiOnly
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^[_.-]+|[_.-]+$/g, '')
        .slice(0, 80)

    return normalized || `game_${gameId}`.slice(0, 80)
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
