// Function to create the block with the image with hotspots at the x-hotspot and y-hotspot coordinates, and which can be clicked to display the text at the x-text and y-text coordinates. Alternatively, if the text of a tooltip-text starts with '#' followed by the url of another hotspot block, then clickin on it would replace the current hotspot block with the one in the link
import { loadCSS } from '../../scripts/aem.js';

export default async function decorate(block) {
  await loadCSS(`${window.hlx.codeBasePath}/blocks/hotspot/hotspot.css`);
  const image = block.querySelector('img');
  const hotspotItems = block.querySelectorAll('.hotspot-item');
  const hotspots = [];
  const tooltips = [];
  hotspotItems.forEach((hotspotItem) => {
    const xHotspot = hotspotItem.dataset.xHotspot;
    const yHotspot = hotspotItem.dataset.yHotspot;
    const xText = hotspotItem.dataset.xText;
    const yText = hotspotItem.dataset.yText;
    const tooltipText = hotspotItem.dataset.tooltipText;
    hotspots.push(createHotspot(xHotspot, yHotspot, xText, yText, tooltipText));
    tooltips.push(createTooltip(xText, yText, tooltipText));
  });
}

function createHotspot(xHotspot, yHotspot, xText, yText, tooltipText) {
  const hotspot = document.createElement('div');
  hotspot.className = 'hotspot';
  hotspot.style.cssText = `
  position: absolute;
  top: ${yHotspot}px;
  left: ${xHotspot}px;
  width: 10px;
  height: 10px;
  background-color: red;
  border-radius: 50%;
  cursor: pointer;
  z-index: 1000;
  content: '${tooltipText}';
  `;
  hotspot.innerHTML = tooltipText;
  return hotspot;
}

function createTooltip(xText, yText, tooltipText) {
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.style.cssText = `
  position: absolute;
  top: ${yText}px;
  left: ${xText}px;
  z-index: 1000;
  content: '${tooltipText}';
  `;
  tooltip.innerHTML = tooltipText;
  return tooltip;
}