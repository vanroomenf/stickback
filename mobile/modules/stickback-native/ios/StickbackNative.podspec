Pod::Spec.new do |s|
  s.name           = 'StickbackNative'
  s.version        = '1.0.0'
  s.summary        = 'Stickback: subject cutout and sticker copy on iPhone'
  s.description    = 'Subject cutout with Vision and copying stickers as transparent PNG'
  s.license        = 'MIT'
  s.author         = 'Stickback'
  s.homepage       = 'https://github.com/vanroomenf/stickback'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
end
