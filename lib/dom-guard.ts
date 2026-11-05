/**
 * DOM Mutation Guard
 *
 * Protects React DOM reconciler from throwing NotFoundError when:
 * 1. Hybrid vanilla JS modules mutate the DOM (e.g., innerHTML updates)
 * 2. Browser extensions (Grammarly, Google Translate, password managers) move or remove nodes
 * 3. Modal and overlay portals are dynamically attached or detached
 *
 * Prevents:
 * "NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."
 * "NotFoundError: Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node."
 */

if (typeof window !== "undefined" && typeof window.Node !== "undefined") {
  const nodeProto = Node.prototype;

  if (!(nodeProto as any).__react_dom_guard_installed__) {
    (nodeProto as any).__react_dom_guard_installed__ = true;

    const originalRemoveChild = nodeProto.removeChild;
    nodeProto.removeChild = function <T extends Node>(child: T): T {
      if (child && child.parentNode !== this) {
        if (child.parentNode) {
          return child.parentNode.removeChild(child);
        }
        return child;
      }
      return originalRemoveChild.call(this, child) as T;
    };

    const originalInsertBefore = nodeProto.insertBefore;
    nodeProto.insertBefore = function <T extends Node>(
      newNode: T,
      referenceNode: Node | null
    ): T {
      if (referenceNode && referenceNode.parentNode !== this) {
        if (referenceNode.parentNode) {
          return referenceNode.parentNode.insertBefore(newNode, referenceNode);
        }
        return this.appendChild(newNode) as T;
      }
      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    };

    const originalReplaceChild = nodeProto.replaceChild;
    nodeProto.replaceChild = function <T extends Node>(
      newChild: Node,
      oldChild: T
    ): T {
      if (oldChild && oldChild.parentNode !== this) {
        if (oldChild.parentNode) {
          return oldChild.parentNode.replaceChild(newChild, oldChild);
        }
        return this.appendChild(newChild) as unknown as T;
      }
      return originalReplaceChild.call(this, newChild, oldChild) as T;
    };
  }
}

export {};
