/**
 * Remark plugin that transforms ```mermaid code blocks into <Mermaid chart="..." /> JSX elements.
 * This runs before Shiki so the code block is never syntax-highlighted.
 */
export function remarkMermaid() {
  return (tree: { children: Node[] }) => {
    walk(tree.children);
  };
}

interface Node {
  type: string;
  lang?: string;
  value?: string;
  children?: Node[];
  name?: string;
  attributes?: { type: string; name: string; value: string }[];
}

function walk(children: Node[]) {
  for (let i = 0; i < children.length; i++) {
    const node = children[i];

    if (node.type === "code" && node.lang === "mermaid") {
      children[i] = {
        type: "mdxJsxFlowElement",
        name: "Mermaid",
        attributes: [
          {
            type: "mdxJsxAttribute",
            name: "chart",
            value: node.value ?? "",
          },
        ],
        children: [],
      };
    } else if (node.children) {
      walk(node.children);
    }
  }
}
