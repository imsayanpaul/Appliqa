import React from 'react'
import DottedMap from 'dotted-map'

const map = new DottedMap({ height: 55, grid: 'diagonal' })
const points = map.getPoints()

const svgOptions = {
    backgroundColor: 'transparent',
    color: 'rgba(255, 255, 255, 0.25)',
    radius: 0.15,
}

export default function FeaturesMap() {
    const viewBox = `0 0 120 60`
    return (
        <svg viewBox={viewBox} style={{ background: svgOptions.backgroundColor }} className="w-full">
            {points.map((point, index) => (
                <circle key={index} cx={point.x} cy={point.y} r={svgOptions.radius} fill={svgOptions.color} />
            ))}
        </svg>
    )
}
