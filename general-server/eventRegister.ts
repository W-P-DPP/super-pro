import { sharedEventBus as eventEmitter } from '@super-pro/shared-server';

eventEmitter.on("testEvent", (data: any) => {
  console.log("testEvent received with data:", data);
});
eventEmitter.on("textChat", (data: any) => {
  console.log("testEvent received with data:", data);
});
eventEmitter.on("imageChat", (data: any) => {
  console.log("testEvent received with data:", data);
});
