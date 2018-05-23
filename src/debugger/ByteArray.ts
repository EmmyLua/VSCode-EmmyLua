
import * as sb from "smart-buffer";

export class ByteArray {
    private buffer : sb.SmartBuffer;

    constructor(buf:sb.SmartBuffer|undefined = undefined) {
        if (buf === undefined) {
            this.buffer = new sb.SmartBuffer();
        } else {
            this.buffer = buf;
        }
    }

    writeString(str: string) {
        this.writeUint32(str.length);
        this.buffer.writeString(str);
    }

    readString(): string {
        let len = this.readUint32();
        return this.buffer.readString(len);
    }

    writeUint64(value: number) {
        this.buffer.writeUInt32BE(value >> 8);
        this.buffer.writeUInt32BE(value & 0x00ff);
    }

    readUint64():  number {
        let l = this.buffer.readUInt32BE() << 8;
        let r = this.buffer.readUInt32BE();
        return l + r;
    }

    readUint32(): number {
        return this.buffer.readUInt32BE();
    }

    writeUint32(value: number) {
        this.buffer.writeUInt32BE(value);
    }

    writeBoolean(value: boolean) {
        this.buffer.writeInt8(value ? 1 : 0);
    }

    readByte(): number {
        return this.buffer.readInt8();
    }

    toBuffer(): Buffer {
        return this.buffer.toBuffer();
    }
}