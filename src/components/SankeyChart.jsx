import { useEffect, useRef, useMemo } from 'react'
import { useI18n } from '../i18n'
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'
import { select } from 'd3-selection'
import { computeSankeyData, getSankeyColors } from '../utils/sankey'

export default function SankeyChart({ tasks }) {
  const { t, locale } = useI18n()
  const svgRef = useRef(null)

  const sankeyData = useMemo(() => computeSankeyData(tasks), [tasks])

  useEffect(() => {
    if (!sankeyData || !svgRef.current) return

    const colors = getSankeyColors()
    const { nodes, links } = sankeyData
    const width = svgRef.current.clientWidth || 600
    const height = 300

    const svg = select(svgRef.current)
    svg.selectAll('*').remove()

    const sankeyLayout = sankey()
      .nodeWidth(24)
      .nodePadding(16)
      .extent([[20, 20], [width - 20, height - 20]])
      .nodeAlign(sankeyJustify)
      .nodeId((d) => d.name)
      .nodeSort(null)
      .linkSort(null)

    const { nodes: layoutNodes, links: layoutLinks } = sankeyLayout({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    })

    const link = svg
      .append('g')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.5)
      .selectAll('path')
      .data(layoutLinks)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d) => colors[d.source.name] || '#94a3b8')
      .attr('stroke-width', (d) => Math.max(1, d.width))
      .attr('class', 'sankey-link')

    link
      .append('title')
      .text((d) => `${d.source.name} → ${d.target.name}: ${d.value}`)

    const node = svg
      .append('g')
      .selectAll('g')
      .data(layoutNodes)
      .join('g')
      .attr('class', 'sankey-node')

    node
      .append('rect')
      .attr('x', (d) => d.x0)
      .attr('y', (d) => d.y0)
      .attr('height', (d) => d.y1 - d.y0)
      .attr('width', (d) => d.x1 - d.x0)
      .attr('fill', (d) => colors[d.name] || '#94a3b8')
      .attr('class', 'sankey-node-rect')

    node
      .append('title')
      .text((d) => `${d.name}: ${d.value || 0}`)

    node
      .append('text')
      .attr('x', (d) => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr('y', (d) => (d.y1 + d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => (d.x0 < width / 2 ? 'start' : 'end'))
      .attr('class', 'sankey-node-label')
      .text((d) => d.name)
      .style('font-size', '12px')
      .style('fill', 'var(--text)')
      .style('pointer-events', 'none')

    function sankeyJustify(node, n) {
      const depth = getDepth(node)
      return depth
    }

    function getDepth(node) {
      if (node.name === 'To Do') return 0
      if (node.name === 'In Progress' || node.name === 'Blocked') return 1
      if (node.name === 'Done') return 2
      return 0
    }
  }, [sankeyData, locale])

  if (!sankeyData) {
    return <p className="muted">{t('sankey.noData')}</p>
  }

  return (
    <div className="sankey" style={{ width: '100%' }}>
      <div className="sankey-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#64748b' }}></span>
          <span>{t('sankey.legend.todo')}</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#3b82f6' }}></span>
          <span>{t('sankey.legend.inProgress')}</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#ef4444' }}></span>
          <span>{t('sankey.legend.blocked')}</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#22c55e' }}></span>
          <span>{t('sankey.legend.done')}</span>
        </div>
      </div>
      <svg ref={svgRef} width="100%" height={300} style={{ display: 'block' }} />
    </div>
  )
}