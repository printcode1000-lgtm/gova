# Single responsibility: idempotently register ASOL's existing iOS share bridge and extension in Xcode.

require "xcodeproj"

project_path = File.expand_path("../ios/App/App.xcodeproj", __dir__)
project = Xcodeproj::Project.open(project_path)
app_target = project.targets.find { |target| target.name == "App" }
raise "App target not found" unless app_target

app_group = project.main_group.groups.find { |group| group.display_name == "App" }
raise "App group not found" unless app_group

bridge_ref = app_group.files.find { |file| file.path == "ShareReceivePlugin.swift" } ||
  app_group.new_file("ShareReceivePlugin.swift")
unless app_target.source_build_phase.files_references.include?(bridge_ref)
  app_target.source_build_phase.add_file_reference(bridge_ref)
end

extension_group = project.main_group.groups.find { |group| group.display_name == "ShareExtension" } ||
  project.main_group.new_group("ShareExtension", "../ShareExtension")
controller_ref = extension_group.files.find { |file| file.path == "ShareViewController.swift" } ||
  extension_group.new_file("ShareViewController.swift")
extension_group.new_file("Info.plist") unless extension_group.files.any? { |file| file.path == "Info.plist" }
extension_group.new_file("ShareExtension.entitlements") unless extension_group.files.any? { |file| file.path == "ShareExtension.entitlements" }

extension_target = project.targets.find { |target| target.name == "ShareExtension" } ||
  project.new_target(:app_extension, "ShareExtension", :ios, "15.0")
unless extension_target.source_build_phase.files_references.include?(controller_ref)
  extension_target.source_build_phase.add_file_reference(controller_ref)
end

extension_target.build_configurations.each do |configuration|
  settings = configuration.build_settings
  settings["APPLICATION_EXTENSION_API_ONLY"] = "YES"
  settings["CODE_SIGN_ENTITLEMENTS"] = "../ShareExtension/ShareExtension.entitlements"
  settings["CODE_SIGN_STYLE"] = "Automatic"
  settings["CURRENT_PROJECT_VERSION"] = "202"
  settings["GENERATE_INFOPLIST_FILE"] = "NO"
  settings["INFOPLIST_FILE"] = "../ShareExtension/Info.plist"
  settings["IPHONEOS_DEPLOYMENT_TARGET"] = "15.0"
  settings["MARKETING_VERSION"] = "0.2.2"
  settings["PRODUCT_BUNDLE_IDENTIFIER"] = "hgh.asol.app.ShareExtension"
  settings["SKIP_INSTALL"] = "YES"
  settings["SWIFT_VERSION"] = "5.0"
  settings["TARGETED_DEVICE_FAMILY"] = "1,2"
end

app_target.add_dependency(extension_target) unless app_target.dependencies.any? { |dependency| dependency.target == extension_target }
embed_phase = app_target.copy_files_build_phases.find { |phase| phase.name == "Embed App Extensions" } ||
  app_target.new_copy_files_build_phase("Embed App Extensions")
embed_phase.dst_subfolder_spec = "13"
unless embed_phase.files_references.include?(extension_target.product_reference)
  embed_phase.add_file_reference(extension_target.product_reference, true)
end

project.save
puts "iOS ShareReceive bridge and ShareExtension target are registered."
