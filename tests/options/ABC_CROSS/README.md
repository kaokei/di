## Scene description

class A depends on class B and class C
class B depends on class A and class C
class C depends on class A and class B



```
  test('injector.get(A) should work correctly', async () => {
    // A在injector中
    // 但是B和C在injector中都找不到
    const a = injector.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);

    expect(a.b).toBeUndefined();
    expect(a.c).toBeDefined();
    expect(a.c.id).toBe(33);
  });

    test('injector.get(B) should work correctly', async () => {
    // B在injector中
    // A和C也在injector中，但是A中的B和C都是Skip
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b).not.toBe(b.a.b);
    expect(b).toBe(b.c.b);

    expect(b.a).toBe(b.c.a);
    expect(b.id).toBe(2);
    expect(b.a.id).toBe(1);
    expect(b.a.b).toBeUndefined();
    expect(b.a.c).toBeDefined();
    expect(b.a.c.id).toBe(33);

    expect(b.c).not.toBe(b.a.c);
  });

  test('injector.get(C) should work correctly', async () => {
    // C在injector中
    // A和B也在injector中，但是A中的B和C都是Skip
    const c = injector.get(C);

    expect(c).toBeInstanceOf(C);
    expect(c).not.toBe(c.a.c);
    expect(c).toBe(c.b.c);

    expect(c.a).toBe(c.b.a);
    expect(c.id).toBe(3);
    expect(c.a.id).toBe(1);
    expect(c.a.b).toBeUndefined();
    expect(c.a.c).toBeDefined();
    expect(c.a.c.id).toBe(33);

    expect(c.b).not.toBe(c.a.b);
  });
```
