import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ScoreCardProps {
    region: string;
    rank: number;
    score: number;
    color?: string;
    isHost?: boolean;
}

export function RegionScoreCards({ cards }: { cards: ScoreCardProps[] }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
                <Card key={card.region} className={cn("border-l-4", card.isHost && "ring-2 ring-primary")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {card.region}
                        </CardTitle>
                        <span className={cn(
                            "font-bold text-lg",
                            card.rank === 1 ? "text-yellow-500" :
                                card.rank === 2 ? "text-gray-400" :
                                    card.rank === 3 ? "text-amber-600" : "text-muted-foreground"
                        )}>
                            {card.rank}위
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{card.score.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}점</div>
                        {card.isHost && (
                            <p className="text-xs text-muted-foreground">개최지</p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
