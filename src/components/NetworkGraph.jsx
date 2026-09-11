import { useEffect, useRef, useMemo } from 'react'
import { useI18n } from '../i18n'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force'
import { select } from 'd3-selection'
import { drag } from 'd3-drag'
import { computeNetworkData, getNetworkColors } from '../utils/network'

export default function NetworkGraph({ tasks }) {
  const { t, locale } = useI18n()
  const svgRef = useRef(null)
  const tooltipRef = useRef(null)

  const networkData = useMemo(() => computeNetworkData(tasks), [tasks])
  const colors = getNetworkColors()

  useEffect(() => {
    if (!networkData || !svgRef.current) return

    const { nodes, links } = networkData
    const width = svgRef.current.clientWidth || 600
    const height = 400

    const svg = select(svgRef.current)
    svg.selectAll('*').remove()

    const simulation = forceSimulation(nodes)
      .force(
        'link',
        forceLink(links).id((d) => d.name).distance(120).strength(0.7)
      )
      .force('charge', forceManyBody().strength(-300))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide().radius((d) => d.radius + 4).strength(0.8))

    const link = svg
      .append('g')
      .attr('class', 'network-links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('class', 'network-link')
      .attr('stroke', colors.link)
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', (d) => Math.max(1, 1 + d.weight * 1.5))

    link
      .append('title')
      .text((d) => `${d.source} ↔ ${d.target}: ${t('network.collaboratedOn')} ${d.weight} ${t('network.sprintsTogether')}`)

    const node = svg
      .append('g')
      .attr('class', 'network-nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'network-node')
      .call(
        drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    node
      .append('circle')
      .attr('class', 'network-node-circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => (d.isUnassigned ? colors.unassigned : colors.inProgress))
      .attr('stroke', (d) => (d.bottleneckScore > 0.6 ? colors.bottleneck : 'transparent'))
      .attr('stroke-width', (d) => (d.bottleneckScore > 0.6 ? 3 : 0))

    node
      .append('text')
      .attr('class', 'network-node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', (d) => Math.max(9, Math.min(13, d.radius * 0.6)) + 'px')
      .style('pointer-events', 'none')
      .style('fill', 'var(--text)')
      .text((d) => {
        const maxLen = Math.max(4, Math.floor(d.radius * 0.7))
        return d.name.length > maxLen ? d.name.slice(0, maxLen - 1) + '…' : d.name
      })

    node
      .append('title')
      .text((d) =>
        `${d.name}\n${t('network.tasks')}: ${d.tasks} | ${t('network.points')}: ${d.points}\n${t('network.done')}: ${d.done} | ${t('network.inProgress')}: ${d.inProgress} | ${t('network.blocked')}: ${d.blocked}\n${t('network.collaborators')}: ${d.collaborators || 0}`
      )

    const tooltip = select('body').append('div').attr('class', 'network-tooltip').style('opacity', 0)

    node.on('mouseover', (event, d) => {
      tooltip
        .style('opacity', 1)
        .html(
          `<strong>${d.name}</strong><br/>${t('network.tasks')}: ${d.tasks} | ${t('network.points')}: ${d.points}<br/>${t('network.done')}: ${d.done} | ${t('network.inProgress')}: ${d.inProgress} | ${t('network.blocked')}: ${d.blocked}<br/>${t('network.collaborators')}: ${d.collaborators || 0}${d.bottleneckScore > 0.6 ? `<br/><span style="color:${colors.bottleneck}">⚠ ${t('network.bottleneck')}</span>` : ''}`
        )
        .style('left', event.pageX + 12 + 'px')
        .style('top', event.pageY - 28 + 'px')
    })
      .on('mousemove', (event) => {
        tooltip.style('left', event.pageX + 12 + 'px').style('top', event.pageY - 28 + 'px')
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0)
      })

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)

      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
      tooltip.remove()
    }
  }, [networkData, locale])

  if (!networkData) {
    return <p className="muted">{t('network.noData')}</p>
  }

  const { nodes, links } = networkData
  const bottleneckCount = nodes.filter((n) => n.bottleneckScore > 0.6).length

  return (
    <div className="network">
      <div className="network-header">
        <div className="network-stats">
          <span className="network-stat">
            <span className="network-stat-value">{nodes.length}</span>
            <span className="network-stat-label">{t('network.assignees')}</span>
          </span>
          <span className="network-stat">
            <span className="network-stat-value">{links.length}</span>
            <span className="network-stat-label">{t('network.connections')}</span>
          </span>
          {bottleneckCount > 0 && (
            <span className="network-stat bottleneck">
              <span className="network-stat-value">{bottleneckCount}</span>
              <span className="network-stat-label">{t('network.bottlenecks')}</span>
            </span>
          )}
        </div>
        <div className="network-legend">
          <div className="legend-item">
            <span className="legend-color" style={{ background: colors.inProgress }}></span>
            <span>{t('network.activeAssignee')}</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: colors.unassigned }}></span>
            <span>{t('network.unassigned')}</span>
          </div>
          <div className="legend-item bottleneck">
            <span className="legend-color" style={{ background: 'transparent', border: `2px solid ${colors.bottleneck}`, borderRadius: '50%' }}></span>
            <span>{t('network.bottleneck')}</span>
          </div>
        </div>
      </div>
      <svg ref={svgRef} width="100%" height={400} style={{ display: 'block' }} />
    </div>
  )
}