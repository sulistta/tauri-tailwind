import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'

export default function GithubStarButton() {
    return (
        <Button size="sm" asChild>
            <a
                href="https://github.com/MrLightful/powersync-tauri"
                target="_blank"
                rel="noreferrer"
            >
                <Star size={16} className="mr-1" /> Star Github
            </a>
        </Button>
    )
}
