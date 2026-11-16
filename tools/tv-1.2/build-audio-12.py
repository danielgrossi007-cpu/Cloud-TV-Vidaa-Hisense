# Compila l'altoparlante nativo 1.2 con lo stesso toolchain Zig del 12/11 (cartella vidaa-probe).
# Uso: python build-audio-12.py   (dalla cartella tv-update; il sorgente è native-home-audio-12.c qui accanto)
from pathlib import Path
import subprocess, json
here=Path(__file__).resolve().parent
cfg=json.loads((here/'run11.json').read_text())
p=Path(cfg['previous'])
z=p/'toolchain/ziglang/zig.exe'; lib=p/'toolchain/ziglang/lib'
for need in [z, p/'sound-start.o', p/'libc-sound-stub.so', p/'libdl-sound-stub.so']:
    if not need.exists(): raise SystemExit('Manca '+str(need)+' (eseguire prima build-native-sound.py in vidaa-probe)')
def run(*a): subprocess.run([str(z),*map(str,a)],check=True)
args=['clang','-cc1','-triple','armv7-unknown-linux-gnueabihf','-emit-obj','-O2','-target-cpu','cortex-a7','-mfloat-abi','hard']
for d in ['include','libc/include/arm-linux-gnueabihf','libc/include/generic-glibc','libc/include/arm-linux-any','libc/include/any-linux-any']: args+=['-isystem',lib/d]
run(*args,here/'native-home-audio-12.c','-o',here/'native-home-audio-12.o')
run('ld.lld','-m','armelf_linux_eabi','--dynamic-linker','/lib/ld-linux-armhf.so.3','-e','_start',p/'sound-start.o',here/'native-home-audio-12.o',p/'libc-sound-stub.so',p/'libdl-sound-stub.so','-o',here/'native-home-audio-12')
print('Compilato native-home-audio-12', (here/'native-home-audio-12').stat().st_size, 'byte')
