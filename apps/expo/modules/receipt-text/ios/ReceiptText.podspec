Pod::Spec.new do |s|
  s.name           = 'ReceiptText'
  s.version        = '1.0.0'
  s.summary        = 'Text lines and their positions on a receipt photo'
  s.author         = 'Flatsby'
  s.homepage       = 'https://www.flatsby.com'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'Vision'
  s.source_files   = '**/*.swift'
end
