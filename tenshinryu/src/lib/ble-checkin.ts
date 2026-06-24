"use client";

import { useEffect, useState, useCallback } from "react";

interface BLECheckInProps {
  classId: string;
  studentId: string;
  onCheckIn: () => void;
  onError: (error: string) => void;
}

// BLE Service UUID for Tenshinryu
const DOJO_POP_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const DOJO_POP_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

export function useBLECheckIn({ classId, studentId, onCheckIn, onError }: BLECheckInProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [signalStrength, setSignalStrength] = useState<number | null>(null);

  const startScanning = useCallback(async () => {
    if (!("bluetooth" in navigator)) {
      onError("Bluetooth not supported on this device");
      return false;
    }

    try {
      setIsScanning(true);

      // Request Bluetooth device with our service
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [DOJO_POP_SERVICE_UUID] }],
        optionalServices: [DOJO_POP_SERVICE_UUID],
      });

      // Connect to the device
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(DOJO_POP_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(DOJO_POP_CHARACTERISTIC_UUID);

      // Read the beacon data
      const value = await characteristic.readValue();
      const beaconClassId = new TextDecoder().decode(value);

      // Check if this is the correct class beacon
      if (beaconClassId === classId) {
        // Get signal strength (RSSI) if available
        const rssi = (device as any).rssi || -50;
        setSignalStrength(rssi);

        // Check if close enough (RSSI > -70 is roughly within 2-3 meters)
        if (rssi > -70) {
          setIsCheckedIn(true);
          onCheckIn();
          return true;
        } else {
          onError("Too far from instructor. Please move closer.");
          return false;
        }
      } else {
        onError("Wrong class beacon detected");
        return false;
      }
    } catch (error: any) {
      if (error.name === "NotFoundError") {
        onError("No instructor beacon found. Make sure Bluetooth is on.");
      } else if (error.name === "SecurityError") {
        onError("Bluetooth permission denied");
      } else {
        onError(`BLE Error: ${error.message}`);
      }
      return false;
    } finally {
      setIsScanning(false);
    }
  }, [classId, onCheckIn, onError]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
  }, []);

  return {
    isScanning,
    isCheckedIn,
    signalStrength,
    startScanning,
    stopScanning,
  };
}

// Teacher beacon hook
export function useTeacherBeacon(classId: string) {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startBroadcasting = useCallback(async () => {
    if (!("bluetooth" in navigator)) {
      setError("Bluetooth not supported");
      return;
    }

    try {
      // Note: Web Bluetooth doesn't support broadcasting/beacon mode
      // This would need a native app or server-side BLE beacon
      // For now, we'll simulate with a polling approach
      setIsBroadcasting(true);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const stopBroadcasting = useCallback(() => {
    setIsBroadcasting(false);
  }, []);

  return {
    isBroadcasting,
    error,
    startBroadcasting,
    stopBroadcasting,
  };
}
