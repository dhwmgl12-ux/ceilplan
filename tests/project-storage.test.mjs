import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { calculateBase } from "../lib/calculations/base.ts";

// 저장 모듈이 사용하는 경로만 테스트에서 연결합니다.
const aliases = new Map([
  ["@/types/ceilplan", new URL("../types/ceilplan.ts", import.meta.url).href],
  ["@/lib/project-io", new URL("../lib/project-io.ts", import.meta.url).href],
]);

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const url = aliases.get(specifier);

    if (url) {
      return { url, shortCircuit: true };
    }

    return nextResolve(specifier, context);
  },
});

let readProjects;
let saveProject;

try {
  const storageModule = await import("../lib/project-storage.ts");
  readProjects = storageModule.readProjects;
  saveProject = storageModule.saveProject;
} finally {
  hooks.deregister();
}

const STORAGE_KEY = "ceilplan.projects.v1";

const siteInput = {
  name: "저장 검산 현장",
  widthMm: "4000",
  lengthMm: "3000",
};

const materialInput = {
  mbarSpacingMm: "1000",
  carryingSpacingMm: "1000",
  boardWidthMm: "1000",
  boardLengthMm: "1000",
  layerCount: "1",
  boardLossPercent: "0",
  metalLossPercent: "0",
  mbarStockLengthMm: "4000",
  carryingStockLengthMm: "4000",
  boardUnitPrice: "",
  mbarUnitPrice: "0",
  carryingUnitPrice: "300",
};

const features = [
  {
    id: "feature-1",
    type: "LIGHT_BOX",
    xMm: 0,
    yMm: 0,
    widthMm: 1000,
    lengthMm: 1000,
  },
];

const adjustments = [
  {
    id: "adjustment-1",
    featureId: "feature-1",
    materialId: "MBAR",
    adjustmentType: "ADD",
    quantity: 4,
    unit: "m",
    memo: "등박스 골조 추가",
    sourceType: "USER_INPUT",
    status: "INPUT_BASED",
  },
];

function createProject(overrides = {}) {
  return structuredClone({
    id: "project-1",
    updatedAt: "2026-10-14T00:00:00.000Z",
    siteInput,
    materialInput,
    features,
    adjustments,
    snapshot: null,
    ...overrides,
  });
}

function createSnapshot() {
  return {
    calculatedAt: "2026-10-14T00:00:00.000Z",
    calculationRuleVersion: "area-manual-adjustment-v1",
    siteInput: structuredClone(siteInput),
    materialInput: structuredClone(materialInput),
    features: structuredClone(features),
    adjustments: structuredClone(adjustments),
    result: calculateBase(siteInput, materialInput, {
      features,
      adjustments,
    }),
  };
}

// 테스트마다 별도의 메모리 저장소를 설치합니다.
// 실제 사용자 브라우저 데이터에는 접근하지 않습니다.
function installStorage(t) {
  const previousDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );

  const data = new Map();
  let writeCount = 0;
  let readError = null;
  let writeError = null;

  const storage = {
    getItem(key) {
      if (readError) throw readError;

      return data.has(String(key)) ? data.get(String(key)) : null;
    },

    setItem(key, value) {
      if (writeError) throw writeError;

      data.set(String(key), String(value));
      writeCount += 1;
    },

    removeItem(key) {
      data.delete(String(key));
    },

    clear() {
      data.clear();
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });

  t.after(() => {
    if (previousDescriptor) {
      Object.defineProperty(globalThis, "localStorage", previousDescriptor);
    } else {
      delete globalThis.localStorage;
    }
  });

  return {
    storage,
    getWriteCount: () => writeCount,
    failReads(error) {
      readError = error;
    },
    failWrites(error) {
      writeError = error;
    },
  };
}

// 전역 localStorage를 교체하므로 테스트는 순서대로 실행합니다.
test("브라우저 프로젝트 저장", { concurrency: false }, async (t) => {
  await t.test("저장 데이터가 없으면 빈 목록을 반환한다", (t) => {
    const mock = installStorage(t);

    assert.deepEqual(readProjects(), []);
    assert.equal(mock.getWriteCount(), 0);
  });

  await t.test("이전 배열 형식은 읽기만으로 변경하지 않는다", (t) => {
    const mock = installStorage(t);

    const legacy = {
      id: "legacy-1",
      updatedAt: "2026-10-14T00:00:00.000Z",
      siteInput,
      materialInput,
    };

    const raw = JSON.stringify([legacy]);
    mock.storage.setItem(STORAGE_KEY, raw);

    const writesBefore = mock.getWriteCount();
    const [restored] = readProjects();

    assert.equal(restored.id, "legacy-1");
    assert.deepEqual(restored.features, []);
    assert.deepEqual(restored.adjustments, []);
    assert.equal(restored.snapshot, null);

    assert.equal(mock.storage.getItem(STORAGE_KEY), raw);
    assert.equal(mock.getWriteCount(), writesBefore);
  });

  await t.test("이전 데이터가 있을 때 저장하면 새 형식으로 기록한다", (t) => {
    const mock = installStorage(t);

    mock.storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: "legacy-1",
          updatedAt: "2026-10-13T00:00:00.000Z",
          siteInput,
          materialInput,
        },
      ]),
    );

    saveProject(createProject());

    const stored = JSON.parse(mock.storage.getItem(STORAGE_KEY));

    assert.equal(stored.schemaVersion, 2);
    assert.equal(stored.projects.length, 2);

    const legacy = stored.projects.find((project) => project.id === "legacy-1");

    assert.deepEqual(legacy.features, []);
    assert.deepEqual(legacy.adjustments, []);
    assert.equal(legacy.snapshot, null);
  });

  await t.test("같은 프로젝트를 다시 저장해도 중복되지 않는다", (t) => {
    installStorage(t);

    saveProject(createProject());

    const updated = createProject({
      updatedAt: "2026-10-14T01:00:00.000Z",
      siteInput: {
        ...siteInput,
        name: "수정된 현장명",
      },
    });

    saveProject(updated);

    const projects = readProjects();

    assert.equal(projects.length, 1);
    assert.equal(projects[0].siteInput.name, "수정된 현장명");
    assert.equal(projects[0].updatedAt, updated.updatedAt);
  });

  await t.test("최근 저장 순서로 목록을 반환한다", (t) => {
    installStorage(t);

    saveProject(
      createProject({
        id: "newer",
        updatedAt: "2026-10-14T02:00:00.000Z",
      }),
    );

    saveProject(
      createProject({
        id: "older",
        updatedAt: "2026-10-13T02:00:00.000Z",
      }),
    );

    assert.deepEqual(
      readProjects().map((project) => project.id),
      ["newer", "older"],
    );
  });

  await t.test("입력·조정값·Snapshot을 그대로 복원한다", (t) => {
    installStorage(t);

    const project = createProject({
      snapshot: createSnapshot(),
    });

    saveProject(project);

    const [restored] = readProjects();

    assert.deepEqual(restored, project);
    assert.equal(restored.snapshot.result.materials[0].unitPrice, null);
    assert.equal(restored.snapshot.result.materials[1].unitPrice, 0);
  });

  await t.test("현재 입력과 이전 Snapshot을 각각 보존한다", (t) => {
    installStorage(t);

    const project = createProject({
      snapshot: createSnapshot(),
    });

    project.siteInput.widthMm = "5000";

    saveProject(project);

    const [restored] = readProjects();

    assert.equal(restored.siteInput.widthMm, "5000");
    assert.equal(restored.snapshot.siteInput.widthMm, "4000");
  });

  await t.test("손상된 JSON이 있으면 덮어쓰지 않는다", (t) => {
    const mock = installStorage(t);
    const broken = "{broken-json";

    mock.storage.setItem(STORAGE_KEY, broken);
    const writesBefore = mock.getWriteCount();

    assert.throws(() => readProjects());
    assert.throws(() => saveProject(createProject()));

    assert.equal(mock.storage.getItem(STORAGE_KEY), broken);
    assert.equal(mock.getWriteCount(), writesBefore);
  });

  await t.test("지원하지 않는 버전은 덮어쓰지 않는다", (t) => {
    const mock = installStorage(t);

    const raw = JSON.stringify({
      schemaVersion: 999,
      projects: [],
    });

    mock.storage.setItem(STORAGE_KEY, raw);
    const writesBefore = mock.getWriteCount();

    assert.throws(() => saveProject(createProject()), /지원하지 않는/);

    assert.equal(mock.storage.getItem(STORAGE_KEY), raw);
    assert.equal(mock.getWriteCount(), writesBefore);
  });

  await t.test("중복 프로젝트 ID가 있는 데이터는 거부한다", (t) => {
    const mock = installStorage(t);
    const project = createProject();

    const raw = JSON.stringify({
      schemaVersion: 2,
      projects: [project, project],
    });

    mock.storage.setItem(STORAGE_KEY, raw);
    const writesBefore = mock.getWriteCount();

    assert.throws(() => readProjects(), /중복/);
    assert.throws(() => saveProject(createProject()));

    assert.equal(mock.getWriteCount(), writesBefore);
    assert.equal(mock.storage.getItem(STORAGE_KEY), raw);
  });

  await t.test("연결되지 않은 조정값은 저장하지 않는다", (t) => {
    const mock = installStorage(t);

    saveProject(createProject());
    const before = mock.storage.getItem(STORAGE_KEY);
    const writesBefore = mock.getWriteCount();

    const invalid = createProject({ id: "invalid-project" });
    invalid.adjustments[0].featureId = "missing-feature";

    assert.throws(() => saveProject(invalid));

    assert.equal(mock.storage.getItem(STORAGE_KEY), before);
    assert.equal(mock.getWriteCount(), writesBefore);
  });

  await t.test("잘못된 Snapshot은 기존 데이터를 덮어쓰지 않는다", (t) => {
    const mock = installStorage(t);

    saveProject(createProject());
    const before = mock.storage.getItem(STORAGE_KEY);

    const invalid = createProject({
      snapshot: createSnapshot(),
    });

    invalid.snapshot.result.materials[0].orderQuantity = -1;

    assert.throws(() => saveProject(invalid));
    assert.equal(mock.storage.getItem(STORAGE_KEY), before);
  });

  await t.test("저장 용량 초과 오류를 호출자에게 전달한다", (t) => {
    const mock = installStorage(t);

    saveProject(createProject());
    const before = mock.storage.getItem(STORAGE_KEY);
    const writesBefore = mock.getWriteCount();

    const quotaError = new Error("저장 공간이 부족합니다.");
    quotaError.name = "QuotaExceededError";

    mock.failWrites(quotaError);

    assert.throws(
      () => saveProject(createProject({ id: "project-2" })),
      (error) => error === quotaError,
    );

    assert.equal(mock.storage.getItem(STORAGE_KEY), before);
    assert.equal(mock.getWriteCount(), writesBefore);
  });

  await t.test("저장소 접근 차단 오류를 호출자에게 전달한다", (t) => {
    const mock = installStorage(t);

    const securityError = new Error("저장소 접근이 차단되었습니다.");
    securityError.name = "SecurityError";

    mock.failReads(securityError);

    assert.throws(
      () => readProjects(),
      (error) => error === securityError,
    );

    assert.throws(
      () => saveProject(createProject()),
      (error) => error === securityError,
    );

    assert.equal(mock.getWriteCount(), 0);
  });

  await t.test("저장과 읽기는 입력 객체를 변경하지 않는다", (t) => {
    installStorage(t);

    const project = createProject({
      snapshot: createSnapshot(),
    });

    const original = structuredClone(project);

    saveProject(project);
    assert.deepEqual(project, original);

    const [restored] = readProjects();
    restored.siteInput.name = "읽은 객체만 변경";

    assert.deepEqual(project, original);
    assert.equal(readProjects()[0].siteInput.name, original.siteInput.name);
  });
});
