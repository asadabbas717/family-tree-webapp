import { useEffect, useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { buildFlowGraph } from '../lib/graph';
import { useFamily } from '../store/family-context';
import { PersonNode } from './PersonNode';

function FamilyJunctionNode() {
  return (
    <span className="family-junction" aria-hidden="true">
      <Handle id="junction-target" type="target" position={Position.Top} className="family-handle" />
      <Handle id="junction-source" type="source" position={Position.Bottom} className="family-handle" />
    </span>
  );
}

const nodeTypes: NodeTypes = { person: PersonNode, junction: FamilyJunctionNode };

interface CanvasInnerProps {
  onAddRelative: (personId: string) => void;
  onEdit: (personId: string) => void;
}

function CanvasInner({ onAddRelative, onEdit }: CanvasInnerProps) {
  const {
    data,
    collapsedPersonIds,
    selectedPersonId,
    focusRequest,
    selectPerson,
  } = useFamily();
  const { fitView, setCenter, getNode, zoomIn, zoomOut } = useReactFlow();

  const graph = useMemo(() => {
    const base = data ? buildFlowGraph(data, collapsedPersonIds, selectedPersonId) : { nodes: [], edges: [] };
    return {
      ...base,
      nodes: base.nodes.map((node) =>
        node.type === 'person'
          ? { ...node, data: { ...node.data, onAddRelative, onEdit } }
          : node,
      ),
    };
  }, [data, collapsedPersonIds, selectedPersonId, onAddRelative, onEdit]);

  useEffect(() => {
    if (!selectedPersonId || focusRequest === 0) return;
    const frame = requestAnimationFrame(() => {
      const node = getNode(selectedPersonId);
      if (!node) return;
      const width = node.measured?.width ?? node.width ?? 244;
      const height = node.measured?.height ?? node.height ?? 252;
      void setCenter(node.position.x + width / 2, node.position.y + height / 2, {
        zoom: 1.1,
        duration: 300,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusRequest, getNode, selectedPersonId, setCenter]);

  if (!data) return null;

  return (
    <div className="tree-canvas" aria-label="Interactive family tree canvas">
      <ReactFlow
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.18}
        maxZoom={2}
        panOnScroll
        zoomOnPinch
        zoomOnScroll
        zoomOnDoubleClick={false}
        preventScrolling
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        onPaneClick={() => selectPerson(null)}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} className="tree-background" />
        <MiniMap className="tree-minimap" pannable zoomable aria-label="Family tree minimap" />
      </ReactFlow>

      <div className="canvas-controls" aria-label="Tree view controls">
        <button type="button" onClick={() => void zoomIn({ duration: 180 })} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => void zoomOut({ duration: 180 })} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => void fitView({ padding: 0.2, duration: 300 })}>Fit tree</button>
        {selectedPersonId ? (
          <button
            type="button"
            onClick={() => {
              const node = getNode(selectedPersonId);
              if (!node) return;
              const width = node.measured?.width ?? node.width ?? 244;
              const height = node.measured?.height ?? node.height ?? 252;
              void setCenter(node.position.x + width / 2, node.position.y + height / 2, { zoom: 1.1, duration: 300 });
            }}
          >
            Center selected
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface FamilyTreeCanvasProps {
  onAddRelative: (personId: string) => void;
  onEdit: (personId: string) => void;
}

export function FamilyTreeCanvas({ onAddRelative, onEdit }: FamilyTreeCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner onAddRelative={onAddRelative} onEdit={onEdit} />
    </ReactFlowProvider>
  );
}
