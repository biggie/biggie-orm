Statistical profiling result from v8.log, (9507 ticks, 1228 unaccounted, 0 excluded).

 [Unknown]:
   ticks  total  nonlib   name
   1228   12.9%

 [Shared libraries]:
   ticks  total  nonlib   name
    572    6.0%    0.0%  00629000-0062a000
     43    0.5%    0.0%  /lib/tls/i686/cmov/libc-2.11.1.so
      3    0.0%    0.0%  /lib/tls/i686/cmov/libpthread-2.11.1.so
      1    0.0%    0.0%  /usr/lib/libstdc++.so.6.0.13

 [JavaScript]:
   ticks  total  nonlib   name
   1229   12.9%   13.8%  LazyCompile: SubString native string.js:209
    165    1.7%    1.9%  Stub: SubString
     66    0.7%    0.7%  LazyCompile: forEach native array.js:879
     59    0.6%    0.7%  LazyCompile: <anonymous> /home/tim/Projects/biggie-orm/lib/orm.js:1
     50    0.5%    0.6%  Stub: StringAdd
     30    0.3%    0.3%  Stub: Compare {1}
     30    0.3%    0.3%  KeyedLoadIC: A keyed load IC from the snapshot
     27    0.3%    0.3%  Function: RedisReplyParser.execute /home/tim/.node_libraries/.npm/redis/0.3.0/package/index.js:41
     16    0.2%    0.2%  Stub: StringAdd {1}
     13    0.1%    0.1%  Function: Stream._writeOut net:693
     13    0.1%    0.1%  Function: RedisClient.send_command /home/tim/.node_libraries/.npm/redis/0.3.0/package/index.js:518
     13    0.1%    0.1%  Builtin: A builtin from the snapshot {1}
     11    0.1%    0.1%  LazyCompile: some native array.js:897
      7    0.1%    0.1%  Stub: ToBoolean
      7    0.1%    0.1%  Function: RedisClient.send_command /home/tim/.node_libraries/.npm/redis/0.3.0/package/index.js:592
      7    0.1%    0.1%  Builtin: A builtin from the snapshot {3}
      6    0.1%    0.1%  Stub: GenericBinaryOpStub_ADD_Alloc_RegArgs_UnknownType_Strings
      6    0.1%    0.1%  LazyCompile: <anonymous> /home/tim/Projects/biggie-orm/extra/stress.js:1
      5    0.1%    0.1%  Stub: StringAdd {2}
      5    0.1%    0.1%  Stub: CEntry
      5    0.1%    0.1%  KeyedStoreIC: A keyed store IC from the snapshot
      5    0.1%    0.1%  Function: validateModel /home/tim/Projects/biggie-orm/lib/validations.js:86
      5    0.1%    0.1%  Function: to_array /home/tim/.node_libraries/.npm/redis/0.3.0/package/index.js:31
      5    0.1%    0.1%  Function: RedisClient.send_command /home/tim/.node_libraries/.npm/redis/0.3.0/package/index.js:610
      4    0.0%    0.0%  Stub: NumberToString
      4    0.0%    0.0%  Stub: GenericBinaryOp
      4    0.0%    0.0%  Stub: Compare
      4    0.0%    0.0%  Stub: ArgumentsAccess
      4    0.0%    0.0%  LazyCompile: ToNumber native runtime.js:503
      4    0.0%    0.0%  LazyCompile: <anonymous> /home/tim/Projects/biggie-orm/lib/validations.js:1
      4    0.0%    0.0%  Function: write buffer:197
      4    0.0%    0.0%  Function: modelToQuery /home/tim/Projects/biggie-orm/lib/db.js:1507
      4    0.0%    0.0%  Function: addModelSave /home/tim/Projects/biggie-orm/lib/db.js:1069
      4    0.0%    0.0%  Function: RedisClient.send_command.command_str /home/tim/.node_libraries/.npm/redis/0.3.0/package/index.js:581
      4    0.0%    0.0%  Function: Multi.exec /home/tim/.node_libraries/.npm/redis/0.3.0/package/index.js:705
      3    0.0%    0.0%  Stub: FastNewClosure
      3    0.0%    0.0%  LazyCompile: isFinite native v8natives.js:85
      3    0.0%    0.0%  LazyCompile: indexOf native array.js:948
      3    0.0%    0.0%  LazyCompile: b native string.js:36
      3    0.0%    0.0%  LazyCompile: INSTANCE_OF native runtime.js:359
      3    0.0%    0.0%  Function: validateCollection /home/tim/Projects/biggie-orm/lib/validations.js:275
      3    0.0%    0.0%  Function: Stream.write net:656
      3    0.0%    0.0%  Function: RedisReplyParser.add_multi_bulk_reply /home/tim/.node_libraries/.npm/redis/0.3.0/package/index.js:253
      3    0.0%    0.0%  Function: EventEmitter.emit events:5
      3    0.0%    0.0%  Builtin: A builtin from the snapshot {2}
      2    0.0%    0.0%  Stub: JSEntry
      2    0.0%    0.0%  Stub: FastNewContextStub {1}
      2    0.0%    0.0%  Stub: FastNewContextStub
      2    0.0%    0.0%  LazyCompile: NonStringToString native runtime.js:524
      2    0.0%    0.0%  LazyCompile: <anonymous> node.js:1
      2    0.0%    0.0%  KeyedLoadIC: name
      2    0.0%    0.0%  Function: timeout.active net:199
      2    0.0%    0.0%  Function: small_toString /home/tim/.node_libraries/.npm/redis/0.3.0/package/index.js:21
      2    0.0%    0.0%  Function: onModelId /home/tim/Projects/biggie-orm/lib/db.js:548
      2    0.0%    0.0%  Function: get /home/tim/Projects/biggie-orm/lib/model.js:412
      2    0.0%    0.0%  Function: exports.model.Ctor /home/tim/Projects/biggie-orm/lib/orm.js:47
      2    0.0%    0.0%  Function: addModelAssociations /home/tim/Projects/biggie-orm/lib/db.js:1374
      2    0.0%    0.0%  Function: Queue.push /home/tim/.node_libraries/.npm/redis/0.3.0/package/index.js:302
      2    0.0%    0.0%  Function: Model /home/tim/Projects/biggie-orm/lib/model.js:10
      2    0.0%    0.0%  CallNormal: args_count: 5
      1    0.0%    0.0%  Stub: GenericBinaryOpStub_SUB_Alloc_RegArgs_UnknownType_Default
      1    0.0%    0.0%  Stub: FastNewContextStub {2}
      1    0.0%    0.0%  Stub: FastCloneShallowArray
      1    0.0%    0.0%  Stub: CallFunction
      1    0.0%    0.0%  LazyCompile: markModelAsSaved /home/tim/Projects/biggie-orm/lib/utils.js:4 {1}
      1    0.0%    0.0%  LazyCompile: markModelAsSaved /home/tim/Projects/biggie-orm/lib/utils.js:4
      1    0.0%    0.0%  LazyCompile: keys native v8natives.js:286
      1    0.0%    0.0%  LazyCompile: isArray native array.js:1112
      1    0.0%    0.0%  LazyCompile: UseSparseVariant native array.js:92
      1    0.0%    0.0%  LazyCompile: DefaultString native runtime.js:612
      1    0.0%    0.0%  LazyCompile: ArrayPush native array.js:390
      1    0.0%    0.0%  KeyedCallIC: string
      1    0.0%    0.0%  Function: set /home/tim/Projects/biggie-orm/lib/model.js:391
      1    0.0%    0.0%  Function: saveCollection /home/tim/Projects/biggie-orm/lib/db.js:577
      1    0.0%    0.0%  Function: removeAssociationIds /home/tim/Projects/biggie-orm/lib/db.js:1423
      1    0.0%    0.0%  Function: onFirstStage /home/tim/Projects/biggie-orm/lib/db.js:635
      1    0.0%    0.0%  Function: addModelValidations /home/tim/Projects/biggie-orm/lib/db.js:1452
      1    0.0%    0.0%  Function: Queue.shift /home/tim/.node_libraries/.npm/redis/0.3.0/package/index.js:288
      1    0.0%    0.0%  Function: Multi.exec /home/tim/.node_libraries/.npm/redis/0.3.0/package/index.js:737
      1    0.0%    0.0%  Function: Multi.exec /home/tim/.node_libraries/.npm/redis/0.3.0/package/index.js:715
      1    0.0%    0.0%  Function: Buffer buffer:97
      1    0.0%    0.0%  CallPreMonomorphic: args_count: 2
      1    0.0%    0.0%  CallMegamorphic: args_count: 3
      1    0.0%    0.0%  Builtin: A builtin from the snapshot {5}
      1    0.0%    0.0%  Builtin: A builtin from the snapshot {4}
      1    0.0%    0.0%  Builtin: A builtin from the snapshot

 [C++]:
   ticks  total  nonlib   name
   2401   25.3%   27.0%  v8::internal::BodyVisitorBase<v8::internal::StaticMarkingVisitor>::IteratePointers(v8::internal::HeapObject*, int, int)
   1110   11.7%   12.5%  v8::internal::SweepSpace(v8::internal::PagedSpace*)
    577    6.1%    6.5%  v8::internal::MarkCompactCollector::ProcessMarkingStack()
    541    5.7%    6.1%  v8::internal::MarkCompactCollector::MarkUnmarkedObject(v8::internal::HeapObject*)
    292    3.1%    3.3%  v8::internal::StaticMarkingVisitor::VisitJSFunctionAndFlushCode(v8::internal::Map*, v8::internal::HeapObject*)
    272    2.9%    3.1%  v8::internal::StaticMarkingVisitor::VisitUnmarkedObjects(v8::internal::Object**, v8::internal::Object**)
    151    1.6%    1.7%  v8::internal::OldSpace::PageAllocationLimit(v8::internal::Page*)
    107    1.1%    1.2%  v8::internal::FlexibleBodyVisitor<v8::internal::StaticMarkingVisitor, v8::internal::FixedArray::BodyDescriptor, void>::Visit(v8::internal::Map*, v8::internal::HeapObject*)
     70    0.7%    0.8%  void v8::internal::FlexibleBodyVisitor<v8::internal::StaticMarkingVisitor, v8::internal::JSObject::BodyDescriptor, void>::VisitSpecialized<16>(v8::internal::Map*, v8::internal::HeapObject*)
     70    0.7%    0.8%  v8::internal::FixedBodyVisitor<v8::internal::StaticMarkingVisitor, v8::internal::FixedBodyDescriptor<12, 20, 20>, void>::Visit(v8::internal::Map*, v8::internal::HeapObject*)
     61    0.6%    0.7%  v8::internal::JSObject::LocalLookupRealNamedProperty(v8::internal::String*, v8::internal::LookupResult*)
     54    0.6%    0.6%  v8::internal::UpdatingVisitor::VisitPointers(v8::internal::Object**, v8::internal::Object**)
     44    0.5%    0.5%  v8::String::WriteUtf8(char*, int, int*, v8::String::WriteHints) const
     38    0.4%    0.4%  v8::internal::OverflowObjectSize(v8::internal::HeapObject*)
     35    0.4%    0.4%  _IO_vfprintf
     34    0.4%    0.4%  v8::internal::MarkCompactCollector::RelocateOldNonCodeObject(v8::internal::HeapObject*, v8::internal::PagedSpace*)
     31    0.3%    0.3%  v8::internal::Heap::IterateDirtyRegions(v8::internal::PagedSpace*, bool (*)(unsigned char*, unsigned char*, void (*)(v8::internal::HeapObject**)), void (*)(v8::internal::HeapObject**), v8::internal::Heap::ExpectedPageWatermarkState)
     30    0.3%    0.3%  v8::internal::StringDictionary::FindEntry(v8::internal::String*)
     30    0.3%    0.3%  v8::internal::Heap::Scavenge()
     28    0.3%    0.3%  void v8::internal::String::WriteToFlat<char>(v8::internal::String*, char*, int, int)
     26    0.3%    0.3%  void v8::internal::FlexibleBodyVisitor<v8::internal::StaticMarkingVisitor, v8::internal::JSObject::BodyDescriptor, void>::VisitSpecialized<12>(v8::internal::Map*, v8::internal::HeapObject*)
     24    0.3%    0.3%  v8::internal::RelocIterator::next()
     24    0.3%    0.3%  v8::internal::MarkCompactCollector::SweepSpaces()
     23    0.2%    0.3%  v8::internal::JSObject::LocalLookup(v8::internal::String*, v8::internal::LookupResult*)
     22    0.2%    0.2%  _IO_default_xsputn
     21    0.2%    0.2%  void v8::internal::ScavengingVisitor::EvacuateObject<(v8::internal::ScavengingVisitor::ObjectContents)1, (v8::internal::ScavengingVisitor::SizeRestriction)0>(v8::internal::Map*, v8::internal::HeapObject**, v8::internal::HeapObject*, int)
     21    0.2%    0.2%  v8::internal::StaticMarkingVisitor::VisitCode(v8::internal::Map*, v8::internal::HeapObject*)
     19    0.2%    0.2%  v8::internal::Object::GetProperty(v8::internal::Object*, v8::internal::LookupResult*, v8::internal::String*, PropertyAttributes*)
     19    0.2%    0.2%  v8::internal::MarkCompactCollector::UpdatePointersInOldObject(v8::internal::HeapObject*)
     19    0.2%    0.2%  v8::internal::Heap::ScavengePointer(v8::internal::HeapObject**)
     18    0.2%    0.2%  void v8::internal::ScanOverflowedObjects<v8::internal::HeapObjectIterator>(v8::internal::HeapObjectIterator*)
     18    0.2%    0.2%  v8::internal::CallICBase::UpdateCaches(v8::internal::LookupResult*, v8::internal::InlineCacheState, v8::internal::Handle<v8::internal::Object>, v8::internal::Handle<v8::internal::String>)
     17    0.2%    0.2%  v8::internal::Object::GetPrototype()
     16    0.2%    0.2%  void v8::internal::MarkCompactCollector::EncodeForwardingAddressesInPagedSpace<&(v8::internal::MCAllocateFromOldPointerSpace(v8::internal::HeapObject*, int)), &(v8::internal::MarkCompactCollector::ReportDeleteIfNeeded(v8::internal::HeapObject*))>(v8::internal::PagedSpace*)
     16    0.2%    0.2%  v8::internal::Object::Lookup(v8::internal::String*, v8::internal::LookupResult*)
     16    0.2%    0.2%  v8::internal::LargeObjectSpace::Contains(v8::internal::HeapObject*)
     16    0.2%    0.2%  v8::internal::FlexibleBodyVisitor<v8::internal::NewSpaceScavenger, v8::internal::FixedArray::BodyDescriptor, int>::Visit(v8::internal::Map*, v8::internal::HeapObject*)
     16    0.2%    0.2%  v8::internal::CallICBase::LoadFunction(v8::internal::InlineCacheState, v8::internal::Handle<v8::internal::Object>, v8::internal::Handle<v8::internal::String>)
     15    0.2%    0.2%  void v8::internal::ScavengingVisitor::EvacuateObject<(v8::internal::ScavengingVisitor::ObjectContents)0, (v8::internal::ScavengingVisitor::SizeRestriction)1>(v8::internal::Map*, v8::internal::HeapObject**, v8::internal::HeapObject*, int)
     15    0.2%    0.2%  v8::internal::Heap::IteratePointersInDirtyRegion(unsigned char*, unsigned char*, void (*)(v8::internal::HeapObject**))
     14    0.1%    0.2%  v8::internal::IC::StateFrom(v8::internal::Code*, v8::internal::Object*, v8::internal::Object*)
     13    0.1%    0.1%  v8::internal::OldSpace::DeallocateBlock(unsigned char*, int, bool)
     13    0.1%    0.1%  v8::internal::MemoryAllocator::AllocatePages(int, int*, v8::internal::PagedSpace*)
     13    0.1%    0.1%  v8::internal::MarkCompactCollector::EmptyMarkingStack()
     13    0.1%    0.1%  int v8::internal::FlexibleBodyVisitor<v8::internal::NewSpaceScavenger, v8::internal::JSObject::BodyDescriptor, int>::VisitSpecialized<16>(v8::internal::Map*, v8::internal::HeapObject*)
     12    0.1%    0.1%  void v8::internal::FlexibleBodyVisitor<v8::internal::StaticMarkingVisitor, v8::internal::JSObject::BodyDescriptor, void>::VisitSpecialized<20>(v8::internal::Map*, v8::internal::HeapObject*)
     12    0.1%    0.1%  __vsnprintf_chk
     11    0.1%    0.1%  v8::internal::ScavengingVisitor::EvacuateFixedArray(v8::internal::Map*, v8::internal::HeapObject**, v8::internal::HeapObject*)
     11    0.1%    0.1%  v8::internal::Heap::CopyBlock(unsigned char*, unsigned char*, int)
     11    0.1%    0.1%  v8::internal::FixedBodyVisitor<v8::internal::NewSpaceScavenger, v8::internal::FixedBodyDescriptor<12, 20, 20>, int>::Visit(v8::internal::Map*, v8::internal::HeapObject*)
     10    0.1%    0.1%  void v8::internal::FlexibleBodyVisitor<v8::internal::StaticMarkingVisitor, v8::internal::JSObject::BodyDescriptor, void>::VisitSpecialized<24>(v8::internal::Map*, v8::internal::HeapObject*)
     10    0.1%    0.1%  v8::internal::MarkCompactCollector::ReportDeleteIfNeeded(v8::internal::HeapObject*)
     10    0.1%    0.1%  v8::internal::LoadIC::Load(v8::internal::InlineCacheState, v8::internal::Handle<v8::internal::Object>, v8::internal::Handle<v8::internal::String>)
      9    0.1%    0.1%  v8::internal::Runtime::SetObjectProperty(v8::internal::Handle<v8::internal::Object>, v8::internal::Handle<v8::internal::Object>, v8::internal::Handle<v8::internal::Object>, PropertyAttributes)
      9    0.1%    0.1%  v8::internal::PagedSpace::AllocateRaw(int)
      9    0.1%    0.1%  v8::internal::LoadIC::UpdateCaches(v8::internal::LookupResult*, v8::internal::InlineCacheState, v8::internal::Handle<v8::internal::Object>, v8::internal::Handle<v8::internal::String>)
      9    0.1%    0.1%  v8::internal::HeapObject::IterateBody(v8::internal::InstanceType, int, v8::internal::ObjectVisitor*)
      9    0.1%    0.1%  v8::internal::Builtin_HandleApiCall(v8::internal::(anonymous namespace)::BuiltinArguments<(v8::internal::BuiltinExtraArguments)1>)
      8    0.1%    0.1%  int v8::internal::FlexibleBodyVisitor<v8::internal::NewSpaceScavenger, v8::internal::JSObject::BodyDescriptor, int>::VisitSpecialized<24>(v8::internal::Map*, v8::internal::HeapObject*)
      8    0.1%    0.1%  T.3133
      7    0.1%    0.1%  v8::internal::MarkCompactCollector::RelocateObjects()
      7    0.1%    0.1%  v8::internal::LoadIC_Miss(v8::internal::Arguments)
      7    0.1%    0.1%  v8::internal::CallIC_Miss(v8::internal::Arguments)
      7    0.1%    0.1%  node::Buffer::Utf8Write(v8::Arguments const&)
      6    0.1%    0.1%  v8::internal::ScavengingVisitor::EvacuateShortcutCandidate(v8::internal::Map*, v8::internal::HeapObject**, v8::internal::HeapObject*)
      6    0.1%    0.1%  v8::internal::Runtime_CreateObjectLiteralShallow(v8::internal::Arguments)
      6    0.1%    0.1%  v8::internal::Runtime::GetObjectProperty(v8::internal::Handle<v8::internal::Object>, v8::internal::Handle<v8::internal::Object>)
      6    0.1%    0.1%  v8::internal::RootMarkingVisitor::VisitPointers(v8::internal::Object**, v8::internal::Object**)
      6    0.1%    0.1%  int v8::internal::FlexibleBodyVisitor<v8::internal::NewSpaceScavenger, v8::internal::JSObject::BodyDescriptor, int>::VisitSpecialized<32>(v8::internal::Map*, v8::internal::HeapObject*)
      5    0.1%    0.1%  v8::internal::StaticMarkingVisitor::DataObjectVisitor::Visit(v8::internal::Map*, v8::internal::HeapObject*)
      5    0.1%    0.1%  v8::internal::OS::VSNPrintF(v8::internal::Vector<char>, char const*, char*)
      5    0.1%    0.1%  v8::internal::JSObject::SetProperty(v8::internal::LookupResult*, v8::internal::String*, v8::internal::Object*, PropertyAttributes)
      5    0.1%    0.1%  v8::internal::JSObject::GetNormalizedProperty(v8::internal::LookupResult*)
      5    0.1%    0.1%  v8::internal::Invoke(bool, v8::internal::Handle<v8::internal::JSFunction>, v8::internal::Handle<v8::internal::Object>, int, v8::internal::Object***, bool*)
      5    0.1%    0.1%  v8::internal::HeapObjectIterator::FromNextPage()
      5    0.1%    0.1%  strchrnul
      5    0.1%    0.1%  _IO_fwrite
      5    0.1%    0.1%  T.4522
      4    0.0%    0.0%  v8::internal::VMState::VMState(v8::internal::StateTag)
      4    0.0%    0.0%  v8::internal::String::SlowEquals(v8::internal::String*)
      4    0.0%    0.0%  v8::internal::String::ReadBlock(v8::internal::String*, unsigned char*, unsigned int, unsigned int*, unsigned int*)
      4    0.0%    0.0%  v8::internal::SetProperty(v8::internal::Handle<v8::internal::JSObject>, v8::internal::Handle<v8::internal::String>, v8::internal::Handle<v8::internal::Object>, PropertyAttributes)
      4    0.0%    0.0%  v8::internal::MarkCompactCollector::UpdatePointers()
      4    0.0%    0.0%  v8::internal::MarkCompactCollector::RelocateNewObject(v8::internal::HeapObject*)
      4    0.0%    0.0%  v8::internal::MarkCompactCollector::MarkDescriptorArray(v8::internal::DescriptorArray*)
      4    0.0%    0.0%  v8::internal::Logger::ApiEntryCall(char const*)
      4    0.0%    0.0%  v8::internal::JSObject::AddFastPropertyUsingMap(v8::internal::Map*, v8::internal::String*, v8::internal::Object*)
      4    0.0%    0.0%  v8::internal::Heap::CopyJSObject(v8::internal::JSObject*)
      4    0.0%    0.0%  v8::internal::HashTable<v8::internal::NumberDictionaryShape, unsigned int>::FindEntry(unsigned int)
      4    0.0%    0.0%  v8::Integer::New(int)
      4    0.0%    0.0%  v8::HandleScope::~HandleScope()
      4    0.0%    0.0%  v8::HandleScope::RawClose(v8::internal::Object**)
      3    0.0%    0.0%  v8::internal::Utf8SymbolKey::IsMatch(v8::internal::Object*)
      3    0.0%    0.0%  v8::internal::UpdatePointerToNewGen(v8::internal::HeapObject**)
      3    0.0%    0.0%  v8::internal::String::Utf8Length()
      3    0.0%    0.0%  v8::internal::StackFrameIterator::AdvanceWithHandler()
      3    0.0%    0.0%  v8::internal::SetProperty(v8::internal::Handle<v8::internal::Object>, v8::internal::Handle<v8::internal::Object>, v8::internal::Handle<v8::internal::Object>, PropertyAttributes)
      3    0.0%    0.0%  v8::internal::ScavengingVisitor::EvacuateSeqAsciiString(v8::internal::Map*, v8::internal::HeapObject**, v8::internal::HeapObject*)
      3    0.0%    0.0%  v8::internal::Runtime_StringToLowerCase(v8::internal::Arguments)
      3    0.0%    0.0%  v8::internal::Runtime_LocalKeys(v8::internal::Arguments)
      3    0.0%    0.0%  v8::internal::Object** v8::internal::BitCast<v8::internal::Object**, v8::internal::Object**>(v8::internal::Object** const&)
      3    0.0%    0.0%  v8::internal::Logger::ApiObjectAccess(char const*, v8::internal::JSObject*)
      3    0.0%    0.0%  v8::internal::LogMessageBuilder::WriteToLogFile()
      3    0.0%    0.0%  v8::internal::JSObject::SetProperty(v8::internal::String*, v8::internal::Object*, PropertyAttributes)
      3    0.0%    0.0%  v8::internal::JSObject::GetElementsKind()
      3    0.0%    0.0%  v8::internal::IC::Clear(unsigned char*)
      3    0.0%    0.0%  v8::internal::Heap::AllocateStringFromUtf8(v8::internal::Vector<char const>, v8::internal::PretenureFlag)
      3    0.0%    0.0%  v8::internal::Heap::AllocateRaw(int, v8::internal::AllocationSpace, v8::internal::AllocationSpace)
      3    0.0%    0.0%  v8::internal::Heap::AllocateFixedArrayWithHoles(int, v8::internal::PretenureFlag)
      3    0.0%    0.0%  v8::internal::Heap::AllocateFixedArray(int, v8::internal::PretenureFlag)
      3    0.0%    0.0%  v8::internal::DeepCopyBoilerplate(v8::internal::JSObject*)
      3    0.0%    0.0%  v8::internal::Builtin_ArraySlice(v8::internal::(anonymous namespace)::BuiltinArguments<(v8::internal::BuiltinExtraArguments)0>)
      3    0.0%    0.0%  v8::Object::HasIndexedPropertiesInPixelData()
      3    0.0%    0.0%  v8::IsDeadCheck(char const*)
      3    0.0%    0.0%  v8::HandleScope::HandleScope()
      3    0.0%    0.0%  node::Write(v8::Arguments const&)
      3    0.0%    0.0%  __pthread_mutex_lock
      2    0.0%    0.0%  void v8::internal::ScavengingVisitor::ObjectEvacuationStrategy<(v8::internal::ScavengingVisitor::ObjectContents)1>::VisitSpecialized<16>(v8::internal::Map*, v8::internal::HeapObject**, v8::internal::HeapObject*)
      2    0.0%    0.0%  void v8::internal::MarkCompactCollector::EncodeForwardingAddressesInPagedSpace<&(v8::internal::MCAllocateFromCodeSpace(v8::internal::HeapObject*, int)), &(v8::internal::MarkCompactCollector::ReportDeleteIfNeeded(v8::internal::HeapObject*))>(v8::internal::PagedSpace*)
      2    0.0%    0.0%  v8::internal::Utf8SymbolKey::Hash()
      2    0.0%    0.0%  v8::internal::String::ComputeHashField(unibrow::CharacterStream*, int)
      2    0.0%    0.0%  v8::internal::String::ComputeAndSetHash()
      2    0.0%    0.0%  v8::internal::StackFrameIterator::StackFrameIterator()
      2    0.0%    0.0%  v8::internal::OldSpaceFreeList::Allocate(int, int*)
      2    0.0%    0.0%  v8::internal::Object::GetPropertyWithCallback(v8::internal::Object*, v8::internal::Object*, v8::internal::String*, v8::internal::Object*)
      2    0.0%    0.0%  v8::internal::Object::GetElementWithReceiver(v8::internal::Object*, unsigned int)
      2    0.0%    0.0%  v8::internal::LookupResult::GetValue()
      2    0.0%    0.0%  v8::internal::LargeObjectSpace::AllocateRawInternal(int, int, v8::internal::Executability)
      2    0.0%    0.0%  v8::internal::KeyedLookupCache::Lookup(v8::internal::Map*, v8::internal::String*)
      2    0.0%    0.0%  v8::internal::JSObject::SetNormalizedProperty(v8::internal::LookupResult*, v8::internal::Object*)
      2    0.0%    0.0%  v8::internal::Heap::NumberFromDouble(double, v8::internal::PretenureFlag)
      2    0.0%    0.0%  v8::internal::Heap::MoveBlock(unsigned char*, unsigned char*, int)
      2    0.0%    0.0%  v8::internal::Heap::AllocateUninitializedFixedArray(int)
      2    0.0%    0.0%  v8::internal::Heap::AllocateJSObject(v8::internal::JSFunction*, v8::internal::PretenureFlag)
      2    0.0%    0.0%  v8::internal::Heap::AllocateFixedArray(int)
      2    0.0%    0.0%  v8::internal::GetProperty(v8::internal::Handle<v8::internal::JSObject>, char const*)
      2    0.0%    0.0%  v8::internal::GetKeysInFixedArrayFor(v8::internal::Handle<v8::internal::JSObject>, v8::internal::KeyCollectionType)
      2    0.0%    0.0%  v8::internal::GetEnumPropertyKeys(v8::internal::Handle<v8::internal::JSObject>, bool)
      2    0.0%    0.0%  v8::internal::Failure::RetryAfterGC(int, v8::internal::AllocationSpace)
      2    0.0%    0.0%  v8::internal::Factory::NewFixedArray(int, v8::internal::PretenureFlag)
      2    0.0%    0.0%  v8::internal::Context::global_context()
      2    0.0%    0.0%  v8::internal::CodeGenerator::Load(v8::internal::Expression*)
      2    0.0%    0.0%  v8::internal::Builtin_FastHandleApiCall(v8::internal::(anonymous namespace)::BuiltinArguments<(v8::internal::BuiltinExtraArguments)0>)
      2    0.0%    0.0%  v8::internal::Assembler::call(v8::internal::Handle<v8::internal::Code>, v8::internal::RelocInfo::Mode)
      2    0.0%    0.0%  v8::Value::ToString() const
      2    0.0%    0.0%  v8::String::Utf8Length() const
      2    0.0%    0.0%  v8::FunctionTemplate::GetFunction()
      2    0.0%    0.0%  unibrow::InputBuffer<unibrow::Utf8, unibrow::Buffer<char const*>, 256u>::FillBuffer()
      2    0.0%    0.0%  unibrow::CharacterStream::Length()
      2    0.0%    0.0%  int v8::internal::FlexibleBodyVisitor<v8::internal::NewSpaceScavenger, v8::internal::JSObject::BodyDescriptor, int>::VisitSpecialized<20>(v8::internal::Map*, v8::internal::HeapObject*)
      2    0.0%    0.0%  __libc_write
      2    0.0%    0.0%  T.2142
      1    0.0%    0.0%  void v8::internal::StaticMarkingVisitor::DataObjectVisitor::VisitSpecialized<12>(v8::internal::Map*, v8::internal::HeapObject*)
      1    0.0%    0.0%  void v8::internal::ScavengingVisitor::ObjectEvacuationStrategy<(v8::internal::ScavengingVisitor::ObjectContents)1>::VisitSpecialized<32>(v8::internal::Map*, v8::internal::HeapObject**, v8::internal::HeapObject*)
      1    0.0%    0.0%  void v8::internal::FlexibleBodyVisitor<v8::internal::StaticMarkingVisitor, v8::internal::JSObject::BodyDescriptor, void>::VisitSpecialized<28>(v8::internal::Map*, v8::internal::HeapObject*)
      1    0.0%    0.0%  v8::internal::VMState::~VMState()
      1    0.0%    0.0%  v8::internal::UpdatingVisitor::VisitPointer(v8::internal::Object**)
      1    0.0%    0.0%  v8::internal::UnionOfKeys(v8::internal::Handle<v8::internal::FixedArray>, v8::internal::Handle<v8::internal::FixedArray>)
      1    0.0%    0.0%  v8::internal::Top::global_context()
      1    0.0%    0.0%  v8::internal::Top::ScheduleThrow(v8::internal::Object*)
      1    0.0%    0.0%  v8::internal::SymbolTable::LookupSymbol(v8::internal::Vector<char const>, v8::internal::Object**)
      1    0.0%    0.0%  v8::internal::StubCompiler::CheckPrototypes(v8::internal::JSObject*, v8::internal::Register, v8::internal::JSObject*, v8::internal::Register, v8::internal::Register, v8::internal::Register, v8::internal::String*, int, v8::internal::Label*)
      1    0.0%    0.0%  v8::internal::StubCache::Clear()
      1    0.0%    0.0%  v8::internal::String::ToCString(v8::internal::AllowNullsFlag, v8::internal::RobustnessFlag, int*)
      1    0.0%    0.0%  v8::internal::String::AsArrayIndex(unsigned int*)
      1    0.0%    0.0%  v8::internal::StaticNewSpaceVisitor<v8::internal::NewSpaceScavenger>::VisitSeqAsciiString(v8::internal::Map*, v8::internal::HeapObject*)
      1    0.0%    0.0%  v8::internal::Slot::AsSlot()
      1    0.0%    0.0%  v8::internal::Scanner::ScanString()
      1    0.0%    0.0%  v8::internal::Runtime_SetProperty(v8::internal::Arguments)
      1    0.0%    0.0%  v8::internal::Runtime_KeyedGetProperty(v8::internal::Arguments)
      1    0.0%    0.0%  v8::internal::Runtime_DateCurrentTime(v8::internal::Arguments)
      1    0.0%    0.0%  v8::internal::Runtime_CreateObjectLiteral(v8::internal::Arguments)
      1    0.0%    0.0%  v8::internal::Runtime_CreateArrayLiteral(v8::internal::Arguments)
      1    0.0%    0.0%  v8::internal::Result::ToRegister(v8::internal::Register)
      1    0.0%    0.0%  v8::internal::RelocIterator::RelocIterator(v8::internal::Code*, int)
      1    0.0%    0.0%  v8::internal::RelocInfoWriter::Write(v8::internal::RelocInfo const*)
      1    0.0%    0.0%  v8::internal::Parser::ParseExpression(bool, bool*)
      1    0.0%    0.0%  v8::internal::Parser::ParseAssignmentExpression(bool, bool*)
      1    0.0%    0.0%  v8::internal::PagedSpace::Size()
      1    0.0%    0.0%  v8::internal::OldSpace::SlowAllocateRaw(int)
      1    0.0%    0.0%  v8::internal::OldSpace::PrepareForMarkCompact(bool)
      1    0.0%    0.0%  v8::internal::Object::ToObject()
      1    0.0%    0.0%  v8::internal::OS::TimeCurrentMillis()
      1    0.0%    0.0%  v8::internal::OS::ReleaseStore(int volatile*, int)
      1    0.0%    0.0%  v8::internal::OS::IsOutsideAllocatedSpace(void*)
      1    0.0%    0.0%  v8::internal::OS::Allocate(unsigned int, unsigned int*, bool)
      1    0.0%    0.0%  v8::internal::MarkCompactCollector::GetForwardingAddressInOldSpace(v8::internal::HeapObject*)
      1    0.0%    0.0%  v8::internal::MarkCompactCollector::EncodeForwardingAddressesInNewSpace()
      1    0.0%    0.0%  v8::internal::MarkCompactCollector::CreateBackPointers()
      1    0.0%    0.0%  v8::internal::Map::FindInCodeCache(v8::internal::String*, v8::internal::Code::Flags)
      1    0.0%    0.0%  v8::internal::Map::CreateBackPointers()
      1    0.0%    0.0%  v8::internal::LookupResult::GetCallbackObject()
      1    0.0%    0.0%  v8::internal::Logger::SuspectReadEvent(v8::internal::String*, v8::internal::Object*)
      1    0.0%    0.0%  v8::internal::LogMessageBuilder::AppendAddress(unsigned char*, unsigned char*)
      1    0.0%    0.0%  v8::internal::LogMessageBuilder::AppendAddress(unsigned char*)
      1    0.0%    0.0%  v8::internal::LogMessageBuilder::Append(char)
      1    0.0%    0.0%  v8::internal::LogMessageBuilder::Append(char const*, ...)
      1    0.0%    0.0%  v8::internal::Log::WriteToFile(char const*, int)
      1    0.0%    0.0%  v8::internal::LoadStubCompiler::GetCode(v8::internal::PropertyType, v8::internal::String*)
      1    0.0%    0.0%  v8::internal::LoadIC::PatchInlinedLoad(unsigned char*, v8::internal::Object*, int)
      1    0.0%    0.0%  v8::internal::LinuxMutex::Lock()
      1    0.0%    0.0%  v8::internal::LargeObjectSpace::FindChunkContainingPc(unsigned char*)
      1    0.0%    0.0%  v8::internal::JavaScriptFrame::type() const
      1    0.0%    0.0%  v8::internal::JSObject::GetElementWithReceiver(v8::internal::JSObject*, unsigned int)
      1    0.0%    0.0%  v8::internal::JSObject::FastPropertyAtPut(int, v8::internal::Object*)
      1    0.0%    0.0%  v8::internal::JSObject** v8::internal::BitCast<v8::internal::JSObject**, v8::internal::JSObject**>(v8::internal::JSObject** const&)
      1    0.0%    0.0%  v8::internal::JSEntryStub::MajorKey()
      1    0.0%    0.0%  v8::internal::Heap::MarkCompact(v8::internal::GCTracer*)
      1    0.0%    0.0%  v8::internal::Heap::AllocateRawAsciiString(int, v8::internal::PretenureFlag)
      1    0.0%    0.0%  v8::internal::Heap::AllocateConsString(v8::internal::String*, v8::internal::String*)
      1    0.0%    0.0%  v8::internal::HashTable<v8::internal::SymbolTableShape, v8::internal::HashTableKey*>::FindEntry(v8::internal::HashTableKey*)
      1    0.0%    0.0%  v8::internal::GlobalHandles::IterateAllRoots(v8::internal::ObjectVisitor*)
      1    0.0%    0.0%  v8::internal::GCTracer::~GCTracer()
      1    0.0%    0.0%  v8::internal::FixedArray::UnionOfKeys(v8::internal::FixedArray*)
      1    0.0%    0.0%  v8::internal::FixedArray::CopySize(int)
      1    0.0%    0.0%  v8::internal::ExitFrame::GetStateForFramePointer(unsigned char*, v8::internal::StackFrame::State*)
      1    0.0%    0.0%  v8::internal::DescriptorArray::RemoveTransitions()
      1    0.0%    0.0%  v8::internal::CopyElements(v8::internal::AssertNoAllocation*, v8::internal::FixedArray*, int, v8::internal::FixedArray*, int, int)
      1    0.0%    0.0%  v8::internal::CodeStub::GetCode()
      1    0.0%    0.0%  v8::internal::CodeGenerator::VisitAssignment(v8::internal::Assignment*)
      1    0.0%    0.0%  v8::internal::CharacterStreamUTF16Buffer::Advance()
      1    0.0%    0.0%  v8::internal::CallJsBuiltin(char const*, v8::internal::(anonymous namespace)::BuiltinArguments<(v8::internal::BuiltinExtraArguments)0>)
      1    0.0%    0.0%  v8::internal::AstOptimizer::VisitLiteral(v8::internal::Literal*)
      1    0.0%    0.0%  v8::internal::Assembler::ret(int)
      1    0.0%    0.0%  v8::internal::Assembler::j(v8::internal::Condition, v8::internal::Label*, v8::internal::Hint)
      1    0.0%    0.0%  v8::Value::Uint32Value() const
      1    0.0%    0.0%  v8::Value::ToObject() const
      1    0.0%    0.0%  v8::Value::IsObject() const
      1    0.0%    0.0%  v8::V8::ClearWeak(v8::internal::Object**)
      1    0.0%    0.0%  v8::True()
      1    0.0%    0.0%  v8::Object::GetIndexedPropertiesPixelData()
      1    0.0%    0.0%  v8::Function::Call(v8::Handle<v8::Object>, int, v8::Handle<v8::Value>*)
      1    0.0%    0.0%  unibrow::Utf8::ReadBlock(unibrow::Buffer<char const*>, unsigned char*, unsigned int, unsigned int*, unsigned int*)
      1    0.0%    0.0%  unibrow::InputBuffer<v8::internal::String, v8::internal::String*, 1024u>::FillBuffer()
      1    0.0%    0.0%  operator delete[](void*)
      1    0.0%    0.0%  node::Buffer::Length(v8::Handle<v8::Object>)
      1    0.0%    0.0%  node::Buffer::HasInstance(v8::Handle<v8::Value>)
      1    0.0%    0.0%  node::Buffer::Data(v8::Handle<v8::Object>)
      1    0.0%    0.0%  int v8::internal::FlexibleBodyVisitor<v8::internal::StaticPointersToNewGenUpdatingVisitor, v8::internal::JSObject::BodyDescriptor, int>::VisitSpecialized<32>(v8::internal::Map*, v8::internal::HeapObject*)
      1    0.0%    0.0%  int v8::internal::FlexibleBodyVisitor<v8::internal::NewSpaceScavenger, v8::internal::JSObject::BodyDescriptor, int>::VisitSpecialized<28>(v8::internal::Map*, v8::internal::HeapObject*)
      1    0.0%    0.0%  ev_loop
      1    0.0%    0.0%  ev_invoke_pending
      1    0.0%    0.0%  epoll_poll
      1    0.0%    0.0%  _init
      1    0.0%    0.0%  __pthread_mutex_unlock_usercnt
      1    0.0%    0.0%  __pthread_disable_asynccancel
      1    0.0%    0.0%  _IO_file_xsputn
      1    0.0%    0.0%  T.5710
      1    0.0%    0.0%  T.4518
      1    0.0%    0.0%  T.4517

 [GC]:
   ticks  total  nonlib   name
   6525   68.6%

 [Bottom up (heavy) profile]:
  Note: percentage shows a share of a particular caller in the total
  amount of its parent calls.
  Callers occupying less than 2.0% are not shown.

   ticks parent  name
   2401   25.3%  v8::internal::BodyVisitorBase<v8::internal::StaticMarkingVisitor>::IteratePointers(v8::internal::HeapObject*, int, int)

   1229   12.9%  LazyCompile: SubString native string.js:209
   1228   99.9%    LazyCompile: slice native string.js:546
   1228  100.0%      LazyCompile: <anonymous> node.js:1

   1110   11.7%  v8::internal::SweepSpace(v8::internal::PagedSpace*)

    577    6.1%  v8::internal::MarkCompactCollector::ProcessMarkingStack()

    572    6.0%  00629000-0062a000
    418   73.1%    node::Write(v8::Arguments const&)
    371   88.8%      LazyCompile: forEach native array.js:879
    213   57.4%        LazyCompile: forEach native array.js:879
    213  100.0%          LazyCompile: <anonymous> /home/tim/Projects/biggie-orm/lib/validations.js:1
    213  100.0%            LazyCompile: <anonymous> /home/tim/Projects/biggie-orm/lib/orm.js:1
    158   42.6%        LazyCompile: <anonymous> /home/tim/Projects/biggie-orm/lib/validations.js:1
    158  100.0%          LazyCompile: <anonymous> /home/tim/Projects/biggie-orm/lib/orm.js:1
    158  100.0%            LazyCompile: <anonymous> node.js:1
     47   11.2%      LazyCompile: <anonymous> node.js:1

    541    5.7%  v8::internal::MarkCompactCollector::MarkUnmarkedObject(v8::internal::HeapObject*)

    292    3.1%  v8::internal::StaticMarkingVisitor::VisitJSFunctionAndFlushCode(v8::internal::Map*, v8::internal::HeapObject*)

    272    2.9%  v8::internal::StaticMarkingVisitor::VisitUnmarkedObjects(v8::internal::Object**, v8::internal::Object**)

