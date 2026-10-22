# 무장 사진 해상도 높이기

`esr.py`는 Real-ESRGAN(realesr-general-x4v3, BSD-3)을 torch 없이 numpy로 돌려 사진을 4배로 키운 뒤 지정 너비로 줄입니다.
원본 결이 너무 매끈해지지 않게 원본 확대본을 18% 섞고 살짝 또렷하게 합니다.

가중치: https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth (같은 폴더에 두고 실행)

    python3 esr.py <원본 폴더> <출력 폴더> 768 <파일 이름들...>

2026-10-14: public/assets/generals-realistic-webp 70장을 256×382 → 768×1146으로 바꿨습니다.

## 얼굴 복원 (restore.py)

`restore.py`는 onnxruntime으로 얼굴을 찾아(RetinaFace) 얼굴만 GFPGAN 1.4로 다시 또렷하게 그린 뒤 원본에 부드럽게 되붙이고,
전체에 약한 언샤프와 고운 필름 결을 얹습니다. 모델은 facefusion-assets(models-3.0.0)의 `retinaface_10g.onnx`, `gfpgan_1.4.onnx`를 `models/` 폴더에 둡니다.

    ESR=0 python3 restore.py <원본 폴더> <출력 폴더> <파일 이름들...>

2026-10-18: 사용자가 준 손상향 · 관은병 · 초선 사진을 뺀 70장에 적용했습니다.
