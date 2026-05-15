import { mock, describe, it, expect, beforeEach } from "bun:test";

const mockGetDocs = mock(() => {});
const mockQuery = mock(() => {});
const mockCollection = mock(() => {});
const mockOrderBy = mock(() => {});

mock.module("firebase/firestore", () => ({
  getDocs: mockGetDocs,
  query: mockQuery,
  collection: mockCollection,
  orderBy: mockOrderBy,
}));

mock.module("./config", () => ({
  db: { mockDb: true },
}));

import { getSharedCocktails } from "./cocktails";

describe("getSharedCocktails", () => {
  beforeEach(() => {
    mockGetDocs.mockClear();
    mockQuery.mockClear();
    mockCollection.mockClear();
    mockOrderBy.mockClear();
  });

  it("should return a list of cocktails correctly ordered by name", async () => {
    const mockDocs = [
      { id: "1", data: () => ({ name: "Old Fashioned" }) },
      { id: "2", data: () => ({ name: "Martini" }) },
    ];
    mockGetDocs.mockResolvedValue({ docs: mockDocs } as any);
    mockQuery.mockReturnValue("mockQuery" as any);
    mockCollection.mockReturnValue("mockCollection" as any);
    mockOrderBy.mockReturnValue("mockOrderBy" as any);

    const cocktails = await getSharedCocktails();

    expect(cocktails).toEqual([
      { id: "1", name: "Old Fashioned" },
      { id: "2", name: "Martini" },
    ]);
    expect(mockCollection).toHaveBeenCalledWith({ mockDb: true } as any, "cocktails");
    expect(mockOrderBy).toHaveBeenCalledWith("name", "asc");
    expect(mockQuery).toHaveBeenCalled();
    expect(mockGetDocs).toHaveBeenCalled();
  });

  it("should return an empty array if no cocktails are found", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);

    const cocktails = await getSharedCocktails();

    expect(cocktails).toEqual([]);
    expect(mockGetDocs).toHaveBeenCalled();
  });

  it("should propagate errors from getDocs", async () => {
    const error = new Error("Firestore error");
    mockGetDocs.mockRejectedValue(error as any);

    try {
        await getSharedCocktails();
        expect(true).toBe(false);
    } catch (e: any) {
        expect(e.message).toBe("Firestore error");
    }
  });
});
