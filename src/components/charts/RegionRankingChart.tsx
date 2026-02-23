"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

interface RegionRankingChartProps {
    data: {
        name: string;
        score: number;
        color: string;
    }[];
}

export function RegionRankingChart({ data }: RegionRankingChartProps) {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                    dataKey="name"
                    type="category"
                    width={80}
                    tick={({ x, y, payload }) => (
                        <text x={x} y={y} dy={4} textAnchor="end" fill="#666" fontSize={14}>
                            {payload.value}
                        </text>
                    )}
                />
                <Tooltip
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                지역
                                            </span>
                                            <span className="font-bold text-muted-foreground">
                                                {data.name}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                총점
                                            </span>
                                            <span className="font-bold">
                                                {data.score.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {
                        data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))
                    }
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}
