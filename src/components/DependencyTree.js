import React, { useState } from 'react';

/**
 * Visualizes package dependency hierarchy in a tree structure
 * @param {Array<string>} dependencies - Array of direct dependency names (fallback)
 * @param {Array<Object>} tree - Nested tree structure with { name: string, children?: Node[] }
 * @param {number} total - Total count of dependencies
 * @returns {JSX.Element} The dependency tree component
 * @example
 * <DependencyTree tree={report.dependencyTree.transitive} total={report.dependencyTree.total} />
 * <DependencyTree dependencies={report.dependencyTree.direct} total={report.dependencyTree.total} />
 */
function DependencyTree({ dependencies = [], tree = null, total = 0 }) {
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Recursively renders tree nodes with nested children
   * @param {Array<Object>} nodes - Array of tree nodes
   * @param {number} level - Current nesting level for aria-level
   * @param {string} parentPath - Parent path for stable keys
   * @returns {JSX.Element} Rendered tree nodes
   */
  const renderTreeNodes = (nodes, level = 1, parentPath = '') => {
    if (!nodes || nodes.length === 0) return null;

    const sortedNodes = [...nodes].sort((a, b) => {
      const nameA = typeof a === 'string' ? a : a.name;
      const nameB = typeof b === 'string' ? b : b.name;
      return nameA.localeCompare(nameB);
    });

    return (
      <ul className="tree-root" aria-label={level === 1 ? 'Dependency tree' : undefined} aria-level={level}>
        {sortedNodes.map((node, index) => {
          const nodeName = typeof node === 'string' ? node : node.name;
          const nodeChildren = typeof node === 'string' ? null : node.children;
          const nodePath = parentPath ? `${parentPath}/${nodeName}` : nodeName;

          return (
            <li key={nodePath} className="tree-node">
              📦 {nodeName}
              {nodeChildren && nodeChildren.length > 0 && renderTreeNodes(nodeChildren, level + 1, nodePath)}
            </li>
          );
        })}
      </ul>
    );
  };

  // Use tree structure if provided, otherwise fallback to flat dependencies list
  const hasTree = tree && Array.isArray(tree) && tree.length > 0;
  const hasDependencies = dependencies && dependencies.length > 0;

  return (
    <div className="dependency-tree">
      <h4>
        Dependency Tree
        <span className="dependency-count">{total} total</span>
      </h4>
      
      {!hasTree && !hasDependencies ? (
        <p className="text-muted">No dependencies</p>
      ) : (
        <details open={isExpanded} onToggle={(e) => setIsExpanded(e.target.open)}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
            {isExpanded ? 'Hide dependencies' : 'View all dependencies'}
          </summary>
          <div className="tree-container">
            {hasTree ? renderTreeNodes(tree) : renderTreeNodes(dependencies)}
          </div>
        </details>
      )}
      
      {/* TODO: Fetch transitive dependencies recursively for full tree visualization. 
          This requires additional npm API calls and caching strategy. */}
    </div>
  );
}

export default DependencyTree;
