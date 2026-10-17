#!/usr/bin/env ruby
require 'fileutils'
require 'pathname'
require 'xcodeproj'

project_path = ARGV.fetch(0) { abort 'Usage: ruby scripts/qa/hukamnama/setup-native-tests.rb /isolated/ios/App/App.xcodeproj' }
project_path = File.realpath(project_path)
repository = File.realpath(File.join(__dir__, '../../..'))
abort 'Use an isolated project outside the repository.' if project_path == repository || project_path.start_with?(repository + '/')
abort 'Expected isolated ios/App/App.xcodeproj.' unless project_path.end_with?('/ios/App/App.xcodeproj')

project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |target| target.name == 'App' }
abort 'The original Capacitor App target is missing.' unless app
name = 'HukamnamaShareUITests'
abort "#{name} already exists; reuse it or create a fresh isolated copy." if project.targets.any? { |target| target.name == name }

source_dir = File.join(File.dirname(project_path), name)
FileUtils.mkdir_p(source_dir)
FileUtils.cp(File.join(__dir__, 'NativeShareUITests.swift'), File.join(source_dir, 'NativeShareUITests.swift'))
target = project.new_target(:ui_test_bundle, name, :ios, '15.0')
target.add_dependency(app)
group = project.main_group.new_group(name, name)
target.add_file_references([group.new_file('NativeShareUITests.swift')])
project.root_object.attributes['TargetAttributes'] ||= {}
project.root_object.attributes['TargetAttributes'][target.uuid] = { 'TestTargetID' => app.uuid }

app.build_configurations.each do |configuration|
  configuration.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.naamras.shareqa'
end
target.build_configurations.each do |configuration|
  configuration.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'com.naamras.shareqa.uitests',
    'PRODUCT_NAME' => '$(TARGET_NAME)',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'SWIFT_VERSION' => '5.0',
    'TEST_TARGET_NAME' => 'App',
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'CODE_SIGNING_ALLOWED' => 'NO',
  })
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.add_build_target(target)
scheme.add_test_target(target)
scheme.set_launch_target(app)
scheme.test_action.build_configuration = 'Debug'
scheme.test_action.should_use_launch_scheme_args_env = true
scheme.save_as(project_path, name, true)
puts "Added #{name} to isolated project; app identifier com.naamras.shareqa."
