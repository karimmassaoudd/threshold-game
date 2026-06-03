import * as THREE from "three";

export function seeded(i) {
  return Math.sin(i * 917.23) * 0.5 + 0.5;
}

export function roadCenter(z) {
  return Math.sin(z * 0.0014) * 24 + Math.sin(z * 0.0041 + 1.7) * 7 + Math.sin(z * 0.00043 + 4) * 42;
}

export function roadHeight(z) {
  return Math.sin(z * 0.002) * 3 + Math.sin(z * 0.0007) * 10;
}

export function roadTangent(z) {
  const dz = 5;
  const a = new THREE.Vector3(roadCenter(z - dz), roadHeight(z - dz), z - dz);
  const b = new THREE.Vector3(roadCenter(z + dz), roadHeight(z + dz), z + dz);
  return b.sub(a).normalize();
}

export function roadSide(z) {
  const tangent = roadTangent(z);
  return new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
}

export function roadPoint(z, lateral = 0) {
  return new THREE.Vector3(roadCenter(z), roadHeight(z), z).addScaledVector(roadSide(z), lateral);
}
