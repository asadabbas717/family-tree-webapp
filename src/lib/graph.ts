import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import { getVisiblePersonIds, getDescendantIds, countDirectChildren } from './family';
import type { FamilyTreeData, Person } from '../types/family';

export type PersonNodeData = Record<string, unknown> & {
  personId: string;
  childCount: number;
  descendantCount: number;
  collapsed: boolean;
  selected: boolean;
  onAddRelative?: (personId: string) => void;
  onEdit?: (personId: string) => void;
};

export type PersonFlowNode = Node<PersonNodeData, 'person'>;
export type JunctionFlowNode = Node<Record<string, never>, 'junction'>;
export type FamilyFlowNode = PersonFlowNode | JunctionFlowNode;

const NODE_WIDTH = 244;
const NODE_HEIGHT = 252;
const PARTNER_GAP = 54;
const UNIT_GAP = NODE_WIDTH + PARTNER_GAP;
const JUNCTION_SIZE = 10;
const JUNCTION_OFFSET = 52;

interface FamilyUnit {
  id: string;
  members: string[];
  slotByPerson: Map<string, number>;
  minSlot: number;
  maxSlot: number;
  width: number;
}

class DisjointSet {
  private parent = new Map<string, string>();

  add(id: string) {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }

  find(id: string): string {
    const parent = this.parent.get(id);
    if (!parent) {
      this.add(id);
      return id;
    }
    if (parent === id) return id;
    const root = this.find(parent);
    this.parent.set(id, root);
    return root;
  }

  union(a: string, b: string) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootB, rootA);
  }
}

function personSort(a: Person, b: Person): number {
  return (
    a.createdAt.localeCompare(b.createdAt) ||
    a.name.localeCompare(b.name) ||
    a.id.localeCompare(b.id)
  );
}

function buildUnits(
  tree: FamilyTreeData,
  visible: Set<string>,
): {
  units: FamilyUnit[];
  unitByPerson: Map<string, string>;
} {
  const sets = new DisjointSet();
  visible.forEach((id) => sets.add(id));

  Object.values(tree.partnerRelationships).forEach((relationship) => {
    if (visible.has(relationship.person1Id) && visible.has(relationship.person2Id)) {
      sets.union(relationship.person1Id, relationship.person2Id);
    }
  });

  const membersByRoot = new Map<string, string[]>();
  visible.forEach((personId) => {
    const root = sets.find(personId);
    const members = membersByRoot.get(root) ?? [];
    members.push(personId);
    membersByRoot.set(root, members);
  });

  const unitByPerson = new Map<string, string>();
  const units: FamilyUnit[] = [];

  for (const members of membersByRoot.values()) {
    const sortedMembers = [...members].sort((a, b) => {
      const personA = tree.people[a];
      const personB = tree.people[b];
      if (!personA && !personB) return a.localeCompare(b);
      if (!personA) return 1;
      if (!personB) return -1;
      return personSort(personA, personB);
    });
    const memberSet = new Set(sortedMembers);
    const anchor = sortedMembers.find((memberId) =>
      Object.values(tree.parentChildRelationships).some(
        (relationship) =>
          relationship.childId === memberId &&
          visible.has(relationship.parentId) &&
          !memberSet.has(relationship.parentId),
      ),
    );

    const ordered = anchor
      ? [anchor, ...sortedMembers.filter((id) => id !== anchor)]
      : sortedMembers;

    const slots: number[] = [];
    if (anchor) {
      slots.push(0);
      for (let index = 1; index < ordered.length; index += 1) {
        const distance = Math.ceil(index / 2);
        slots.push(index % 2 === 1 ? distance : -distance);
      }
    } else {
      const start = -(ordered.length - 1) / 2;
      for (let index = 0; index < ordered.length; index += 1) slots.push(start + index);
    }

    const slotByPerson = new Map<string, number>(
      ordered.map((id, index) => [id, slots[index] ?? 0]),
    );
    const minSlot = Math.min(...slots);
    const maxSlot = Math.max(...slots);
    const width = NODE_WIDTH + (maxSlot - minSlot) * UNIT_GAP;
    const unitId = `unit_${JSON.stringify([...sortedMembers].sort())}`;

    ordered.forEach((personId) => unitByPerson.set(personId, unitId));
    units.push({ id: unitId, members: ordered, slotByPerson, minSlot, maxSlot, width });
  }

  return { units, unitByPerson };
}

export function buildFlowGraph(
  tree: FamilyTreeData,
  collapsedPersonIds: string[],
  selectedPersonId: string | null,
): { nodes: FamilyFlowNode[]; edges: Edge[] } {
  const visible = getVisiblePersonIds(tree, collapsedPersonIds);
  const collapsed = new Set(collapsedPersonIds);
  const { units, unitByPerson } = buildUnits(tree, visible);
  const graph = new dagre.graphlib.Graph();

  graph.setGraph({
    rankdir: 'TB',
    ranksep: 185,
    nodesep: 92,
    edgesep: 42,
    marginx: 72,
    marginy: 72,
    ranker: 'network-simplex',
  });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const unit of units) {
    graph.setNode(unit.id, { width: unit.width, height: NODE_HEIGHT });
  }

  const unitEdges = new Set<string>();
  for (const relationship of Object.values(tree.parentChildRelationships)) {
    if (!visible.has(relationship.parentId) || !visible.has(relationship.childId)) continue;
    const parentUnit = unitByPerson.get(relationship.parentId);
    const childUnit = unitByPerson.get(relationship.childId);
    if (!parentUnit || !childUnit || parentUnit === childUnit) continue;
    const key = `${parentUnit}->${childUnit}`;
    if (unitEdges.has(key)) continue;
    unitEdges.add(key);
    graph.setEdge(parentUnit, childUnit, { weight: 8, minlen: 1 });
  }

  dagre.layout(graph);

  const personCenters = new Map<string, { x: number; y: number }>();
  const nodes: FamilyFlowNode[] = [];

  for (const unit of units) {
    const position = graph.node(unit.id) as { x: number; y: number } | undefined;
    const unitCenterX = position?.x ?? 0;
    const unitCenterY = position?.y ?? 0;
    const slotCenter = (unit.minSlot + unit.maxSlot) / 2;

    for (const personId of unit.members) {
      const slot = unit.slotByPerson.get(personId) ?? 0;
      const centerX = unitCenterX + (slot - slotCenter) * UNIT_GAP;
      const centerY = unitCenterY;
      personCenters.set(personId, { x: centerX, y: centerY });
      nodes.push({
        id: personId,
        type: 'person',
        position: {
          x: centerX - NODE_WIDTH / 2,
          y: centerY - NODE_HEIGHT / 2,
        },
        draggable: false,
        selectable: true,
        data: {
          personId,
          childCount: countDirectChildren(tree, personId),
          descendantCount: getDescendantIds(tree, personId).size,
          collapsed: collapsed.has(personId),
          selected: selectedPersonId === personId,
        },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    }
  }

  const partnerEdges: Edge[] = Object.values(tree.partnerRelationships)
    .filter(
      (relationship) => visible.has(relationship.person1Id) && visible.has(relationship.person2Id),
    )
    .flatMap((relationship) => {
      const first = personCenters.get(relationship.person1Id);
      const second = personCenters.get(relationship.person2Id);
      if (!first || !second) return [];
      const leftId = first.x <= second.x ? relationship.person1Id : relationship.person2Id;
      const rightId =
        leftId === relationship.person1Id ? relationship.person2Id : relationship.person1Id;
      return [
        {
          id: `partner_${relationship.id}`,
          source: leftId,
          target: rightId,
          sourceHandle: 'partner-right',
          targetHandle: 'partner-left',
          type: 'straight',
          className: 'edge-partner',
          label: relationship.customLabel || friendlyPartnerType(relationship.type),
          labelShowBg: true,
          labelBgPadding: [6, 4] as [number, number],
          labelBgBorderRadius: 8,
          style: { strokeWidth: 2.5 },
          zIndex: 2,
        } satisfies Edge,
      ];
    });

  const parentsByChild = new Map<string, string[]>();
  for (const relationship of Object.values(tree.parentChildRelationships)) {
    if (!visible.has(relationship.parentId) || !visible.has(relationship.childId)) continue;
    const parents = parentsByChild.get(relationship.childId) ?? [];
    if (!parents.includes(relationship.parentId)) parents.push(relationship.parentId);
    parentsByChild.set(relationship.childId, parents);
  }

  const childrenByParentSet = new Map<string, { parents: string[]; children: string[] }>();
  for (const [childId, parentIds] of parentsByChild) {
    const parents = [...parentIds].sort();
    const key = JSON.stringify(parents);
    const entry = childrenByParentSet.get(key) ?? { parents, children: [] };
    entry.children.push(childId);
    childrenByParentSet.set(key, entry);
  }

  const parentEdges: Edge[] = [];
  let junctionIndex = 0;

  for (const entry of childrenByParentSet.values()) {
    const parentPositions = entry.parents
      .map((id) => personCenters.get(id))
      .filter((position): position is { x: number; y: number } => Boolean(position));
    if (parentPositions.length === 0) continue;

    const junctionId = `junction_${junctionIndex++}_${entry.parents.join('_')}`;
    const centerX =
      parentPositions.reduce((sum, position) => sum + position.x, 0) / parentPositions.length;
    const parentBottom = Math.max(
      ...parentPositions.map((position) => position.y + NODE_HEIGHT / 2),
    );
    const junctionCenterY = parentBottom + JUNCTION_OFFSET;

    nodes.push({
      id: junctionId,
      type: 'junction',
      position: {
        x: centerX - JUNCTION_SIZE / 2,
        y: junctionCenterY - JUNCTION_SIZE / 2,
      },
      draggable: false,
      selectable: false,
      focusable: false,
      data: {},
      width: JUNCTION_SIZE,
      height: JUNCTION_SIZE,
      zIndex: 1,
    });

    for (const parentId of entry.parents) {
      parentEdges.push({
        id: `parent_to_${junctionId}_${parentId}`,
        source: parentId,
        target: junctionId,
        sourceHandle: 'child-source',
        targetHandle: 'junction-target',
        type: 'smoothstep',
        className: 'edge-parent-child edge-parent-stem',
        style: { strokeWidth: 2 },
        zIndex: 0,
      });
    }

    for (const childId of entry.children) {
      parentEdges.push({
        id: `${junctionId}_to_child_${childId}`,
        source: junctionId,
        target: childId,
        sourceHandle: 'junction-source',
        targetHandle: 'parent-target',
        type: 'smoothstep',
        className: 'edge-parent-child',
        style: { strokeWidth: 2 },
        zIndex: 0,
      });
    }
  }

  return { nodes, edges: [...parentEdges, ...partnerEdges] };
}

function friendlyPartnerType(type: string): string {
  const labels: Record<string, string> = {
    spouses: 'Spouses',
    partners: 'Partners',
    'co-parents': 'Co-parents',
    divorced: 'Divorced',
    separated: 'Separated',
    widowed: 'Widowed',
    unspecified: 'Relationship',
    custom: 'Relationship',
  };
  return labels[type] ?? 'Relationship';
}
