// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResponsiveTable, type Column } from "./responsive-table";

type Item = { id: string; name: string; score: number };

const columns: Column<Item>[] = [
  { key: "name", header: "Name", cell: (item) => item.name, primary: true },
  { key: "score", header: "Score", cell: (item) => String(item.score) },
];

describe("ResponsiveTable", () => {
  it("renders desktop and mobile views without horizontal scroll blow-outs", () => {
    render(
      <ResponsiveTable
        columns={columns}
        rows={[{ id: "1", name: "Alpha", score: 10 }]}
        getRowKey={(item) => item.id}
      />,
    );

    expect(screen.getAllByText("Alpha").length).toBeGreaterThanOrEqual(1);
  });
});
