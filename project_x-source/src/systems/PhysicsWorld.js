import * as CANNON from "cannon-es";

export class PhysicsWorld {
  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -18, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.materials = {
      road: new CANNON.Material("road"),
      tire: new CANNON.Material("tire"),
      barrier: new CANNON.Material("barrier"),
    };
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.materials.road, this.materials.tire, {
      friction: 0.75,
      restitution: 0.02,
      contactEquationStiffness: 1e7,
    }));
    const ground = new CANNON.Body({ mass: 0, material: this.materials.road });
    ground.addShape(new CANNON.Plane());
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(ground);
    this.bodies = [ground];
  }

  addBody(body) {
    this.world.addBody(body);
    this.bodies.push(body);
  }

  removeBody(body) {
    this.world.removeBody(body);
    this.bodies = this.bodies.filter((item) => item !== body);
  }

  reset() {
    for (const body of this.bodies) {
      if (body.mass > 0) {
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
      }
    }
  }

  step(dt) {
    this.world.step(1 / 120, dt, 4);
  }
}
