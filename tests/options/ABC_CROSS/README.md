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
```
